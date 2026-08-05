/**
 * useRealtimeSocket — owns the WebSocket lifecycle for the LiveFeed panel.
 *
 * Connects on mount, subscribes to the project event room, and appends events
 * into a bounded ring buffer. Disconnects on unmount.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MAX_LIVE_EVENTS, type LiveEvent, type LiveFeedStatus } from './live-feed-utils';

export interface RealtimeSocketState {
  events: LiveEvent[];
  status: LiveFeedStatus;
  pausedRef: React.MutableRefObject<boolean>;
  setPausedRef: (v: boolean) => void;
  clearEvents: () => void;
}

export function useRealtimeSocket(projectId: string): RealtimeSocketState {
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<LiveFeedStatus>('connecting');
  const pausedRef = useRef<boolean>(false);
  const setPausedRef = (v: boolean) => { pausedRef.current = v; };
  const clearEvents = () => setEvents([]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    let seq = 0;

    void (async () => {
      const sdk = getSdk() as unknown as {
        realtime?: {
          connect(token: string | (() => string), projectId?: string): Promise<void>;
          subscribeProject(projectId: string, handler: (e: unknown) => void): () => void;
          disconnect(): void;
        };
      };
      const rt = sdk.realtime;
      if (!rt) { setStatus('disconnected'); return; }

      const token = (): string =>
        (typeof window !== 'undefined'
          ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
          : '');

      try {
        setStatus('connecting');
        await rt.connect(token, projectId);
        if (cancelled) { rt.disconnect(); return; }
        setStatus('connected');
        unsub = rt.subscribeProject(projectId, (raw) => {
          if (pausedRef.current) return;
          const e = raw as { type?: string; timestamp?: string; data?: Record<string, unknown> };
          if (!e?.type) return;
          const item: LiveEvent = {
            id: `${Date.now()}-${seq++}`,
            type: e.type,
            timestamp: e.timestamp ?? new Date().toISOString(),
            data: e.data,
          };
          setEvents(prev => {
            const next = [...prev, item];
            return next.length > MAX_LIVE_EVENTS ? next.slice(next.length - MAX_LIVE_EVENTS) : next;
          });
        });
      } catch {
        if (!cancelled) setStatus('disconnected');
      }
    })();

    return () => {
      cancelled = true;
      try { unsub?.(); } catch { /* socket may already be closed */ }
      try {
        const rt2 = (getSdk() as unknown as { realtime?: { disconnect?: () => void } }).realtime;
        rt2?.disconnect?.();
      } catch { /* socket may already be closed */ }
    };
  }, [projectId, getSdk]);

  return { events, status, pausedRef, setPausedRef, clearEvents };
}
