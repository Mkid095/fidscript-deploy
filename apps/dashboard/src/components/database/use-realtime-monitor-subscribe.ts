'use client';

import { useCallback, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export function useRealtimeMonitorSubscribe(
  databaseId: string | null,
  getSdk: () => FidscriptSDK,
) {
  const unsubsRef = useRef<Record<string, () => void>>({});

  const subscribe = useCallback((table: string, onEvent: (event: {
    eventType: string;
    old: unknown;
    new: unknown;
    timestamp: string;
  }) => void) => {
    if (!databaseId) return;
    const sdk = getSdk();
    sdk.database(databaseId).from(table).subscribe((event: unknown) => {
      const e = event as { eventType: string; old: unknown; new: unknown; timestamp: string };
      onEvent({
        eventType: e.eventType,
        old: e.old ?? {},
        new: e.new ?? {},
        timestamp: e.timestamp ?? new Date().toISOString(),
      });
    }).then(sub => { unsubsRef.current[table] = () => sub.unsubscribe(); });
  }, [databaseId, getSdk]);

  const unsubscribe = useCallback((table: string) => {
    unsubsRef.current[table]?.();
    delete unsubsRef.current[table];
  }, []);

  const unsubscribeAll = useCallback(() => {
    Object.values(unsubsRef.current).forEach(fn => fn());
    unsubsRef.current = {};
  }, []);

  return { subscribe, unsubscribe, unsubscribeAll };
}
