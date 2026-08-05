'use client';

import { useEffect, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export function useDataGridRealtime(
  table: string,
  databaseId: string | null,
  isRealtime: boolean,
  getSdk: () => FidscriptSDK,
  onRefresh: () => void,
) {
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isRealtime || !databaseId) return;
    const sdk = getSdk();
    let mounted = true;

    sdk.database(databaseId).from(table).subscribe((event: unknown) => {
      if (!mounted) return;
      const e = event as { eventType: string };
      if (['INSERT', 'UPDATE', 'DELETE'].includes(e.eventType)) onRefresh();
    }).then(sub => {
      if (mounted) unsubRef.current = () => sub.unsubscribe();
    }).catch(() => { /* realtime not available */ });

    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [isRealtime, databaseId, table, getSdk, onRefresh]);
}
