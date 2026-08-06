/**
 * useRealtimeSocket — LiveFeed's view of the project realtime event stream.
 *
 * The socket lifecycle is owned by <RealtimeProvider> in the project shell
 * (see src/contexts/realtime-context.tsx and the architecture doc §3 —
 * "Realtime is background infrastructure, it must not connect only when a
 * page is visited"). This hook only SUBSCRIBES to the existing stream and
 * tracks connection status for the UI. It never calls connect/disconnect,
 * so mounting/unmounting the LiveFeed cannot disrupt other pages.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { MAX_LIVE_EVENTS, type LiveEvent, type LiveFeedStatus } from './live-feed-utils';

export interface RealtimeSocketState {
  events: LiveEvent[];
  status: LiveFeedStatus;
  pausedRef: React.MutableRefObject<boolean>;
  setPausedRef: (v: boolean) => void;
  clearEvents: () => void;
}

export function useRealtimeSocket(_projectId: string): RealtimeSocketState {
  const { status, subscribe } = useRealtime();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const pausedRef = useRef<boolean>(false);
  const setPausedRef = (v: boolean) => { pausedRef.current = v; };
  const clearEvents = () => setEvents([]);
  const seqRef = useRef(0);

  useEffect(() => {
    const unsub = subscribe('*', (raw) => {
      if (pausedRef.current) return;
      const e = raw as { type?: string; timestamp?: string; data?: Record<string, unknown> };
      if (!e?.type) return;
      const item: LiveEvent = {
        id: `${Date.now()}-${seqRef.current++}`,
        type: e.type,
        timestamp: e.timestamp ?? new Date().toISOString(),
        data: e.data,
      };
      setEvents(prev => {
        const next = [...prev, item];
        return next.length > MAX_LIVE_EVENTS ? next.slice(next.length - MAX_LIVE_EVENTS) : next;
      });
    });
    return unsub;
  }, [subscribe]);

  return { events, status, pausedRef, setPausedRef, clearEvents };
}
