'use client';

/**
 * useActivityFeed — owns the Activity feed's data lifecycle.
 *
 * Loads the last 50 events via the SDK on mount, then opens a realtime
 * subscription to append new events to the head of the list. Exposes a
 * `reload()` callback the body can call to refresh from the SDK.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';

import { toActivityEvent, type ActivityEvent, type PlatformEvent } from './activity-utils';

export interface ActivityFeedState {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  reload: () => Promise<void>;
}

export function useActivityFeed(projectId: string): ActivityFeedState {
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const rtRef = useRef<{ disconnect?: () => void } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const raw = await sdk.projects.getEvents(projectId, 50);
      const arr: PlatformEvent[] = Array.isArray(raw) ? raw as PlatformEvent[] : [];
      setEvents(arr.map(toActivityEvent));
    } catch {
      setError('Could not load events');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => {
    let cancelled = false;

    async function connectRealtime() {
      try {
        const sdk = getSdk();
        const rt = (sdk as { realtime?: typeof sdk.realtime }).realtime;
        if (!rt) return;

        const token = localStorage.getItem('fidscript_access_token')
          ?? localStorage.getItem('fidscript_token');
        if (!token) return;

        // Pass a getter so socket.io re-reads the (possibly refreshed) JWT on
        // every reconnect instead of pinning a token that may expire mid-session.
        await rt.connect(() => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '', projectId);
        if (cancelled) { rt.disconnect?.(); return; }

        setConnected(true);

        const unsub = rt.subscribeProject(projectId, (event: unknown) => {
          if (cancelled) return;
          setEvents(prev => [toActivityEvent(event as PlatformEvent), ...prev].slice(0, 100));
        });
        rtRef.current = { disconnect: () => { unsub(); rt.disconnect?.(); } };
      } catch {
        if (!cancelled) setConnected(false);
      }
    }

    void reload();
    void connectRealtime();

    return () => {
      cancelled = true;
      rtRef.current?.disconnect?.();
    };
  }, [projectId, getSdk, reload]);

  return { events, loading, error, connected, reload };
}
