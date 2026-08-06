/**
 * RealtimeProvider — owns the project-scoped Socket.IO lifecycle for the
 * duration of the project shell.
 *
 * Architecture (docs/reference/platform-architecture-part1.md §3):
 *   "Realtime is background infrastructure — it must NOT connect only when
 *    a page is visited. It runs continuously."
 *   "useRealtimeConnection(projectId) connects as soon as user logs in
 *    [or enters the project shell]. Connection lives in a context provider
 *    above all pages."
 *
 * Before this, every hook that wanted events (LiveFeed, deployments-fetch,
 * activity-feed, queues/storage/log-viewer) called `rt.connect()` AND
 * `rt.disconnect()` independently. Calling disconnect on one component's
 * unmount tore down the shared socket for everyone else, producing the
 * "connecting → disconnected" symptom on the Realtime page.
 *
 * This provider hosts a single socket keyed by projectId. Page hooks
 * subscribe via `useRealtimeSubscription(prefix, handler)` and never touch
 * connect/disconnect themselves. The socket is closed only when the user
 * leaves the project shell or logs out.
 */
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './auth-context';
import { useProjectContext } from './project-context';

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface RealtimeContextValue {
  status: RealtimeStatus;
  /** Subscribe to events whose type starts with `prefix` (or all events when
   *  prefix is '*'). Returns an unsubscribe function. The socket is shared
   *  and reference-counted; subscribes never tear it down. */
  subscribe: (prefix: string, handler: (event: unknown) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface HandlerSet { handler: (event: unknown) => void }
const PREFIX_ALL = '*';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { getSdk } = useAuth();
  const { projectId } = useProjectContext();
  const socketRef = useRef<unknown>(null);
  const handlersRef = useRef<Map<string, Set<HandlerSet>>>(new Map());
  const cancelledRef = useRef(false);
  const [status, setStatus] = useState<RealtimeStatus>('idle');

  useEffect(() => {
    cancelledRef.current = false;
    if (!projectId) return;

    // Token getter — socket.io re-evaluates function-form auth on every
    // (re)connect, so a refreshed JWT is picked up automatically.
    const token = (): string =>
      (typeof window !== 'undefined'
        ? (window.localStorage.getItem('fidscript_access_token')
          ?? window.localStorage.getItem('fidscript_token')
          ?? '')
        : '');

    let cleanupCurrent: (() => void) | null = null;

    void (async () => {
      const sdk = getSdk();
      const rt = (sdk as unknown as {
        realtime?: {
          connect: (t: string | (() => string), projectId?: string) => Promise<void>;
          subscribeProject: (projectId: string, handler: (e: unknown) => void) => () => void;
          disconnect: () => void;
        };
      }).realtime;
      if (!rt) { setStatus('disconnected'); return; }

      try {
        setStatus('connecting');
        await rt.connect(token, projectId);
        if (cancelledRef.current) { rt.disconnect(); return; }
        setStatus('connected');

        // The SDK's `subscribeProject` is server-side `subscribe_project` which
        // joins the project room. We keep that single subscription open and
        // fan events out to all client-side handlers.
        const unsub = rt.subscribeProject(projectId, (raw) => {
          const event = raw as { type?: string };
          if (!event?.type) return;
          for (const [prefix, set] of handlersRef.current) {
            if (prefix === PREFIX_ALL || event.type === prefix || event.type.startsWith(prefix + '.')) {
              for (const h of set) {
                try { h.handler(event); } catch { /* never break dispatch */ }
              }
            }
          }
        });

        cleanupCurrent = () => { try { unsub(); } catch { /* */ } };
      } catch {
        if (!cancelledRef.current) setStatus('disconnected');
      }
    })();

    return () => {
      cancelledRef.current = true;
      cleanupCurrent?.();
      socketRef.current = null;
      setStatus('idle');
    };
  }, [projectId, getSdk]);

  function subscribe(prefix: string, handler: (event: unknown) => void): () => void {
    if (!handlersRef.current.has(prefix)) handlersRef.current.set(prefix, new Set());
    const set = handlersRef.current.get(prefix)!;
    const entry: HandlerSet = { handler };
    set.add(entry);
    return () => {
      set.delete(entry);
      if (set.size === 0) handlersRef.current.delete(prefix);
    };
  }

  return (
    <RealtimeContext.Provider value={{ status, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return ctx;
}
