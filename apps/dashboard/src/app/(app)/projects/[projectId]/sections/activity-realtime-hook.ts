'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toActivityEvent, type ActivityEvent, type PlatformEvent } from './activity-types';

export function useActivityRealtime(projectId: string) {
  const { getSdk } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const rtRef = useRef<{ disconnect?: () => void } | null>(null);

  const loadInitial = useCallback(async () => {
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

    loadInitial();
    connectRealtime();

    return () => {
      cancelled = true;
      rtRef.current?.disconnect?.();
    };
  }, [projectId, getSdk, loadInitial]);

  return { events, loading, error, connected, loadInitial };
}
