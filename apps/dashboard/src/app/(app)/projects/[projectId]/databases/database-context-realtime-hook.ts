'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { normalizeRealtimeTables } from '@/lib/db-normalize';
import type { RawRealtimeSubscriber } from '@/lib/db-normalize';
import type { RealtimeTableInfo } from './database-context-types';

export function useDatabaseRealtime(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [realtimeTables, setRealtimeTables] = useState<RealtimeTableInfo[]>([]);

  const refreshRealtimeTables = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const raw = await sdk.database(databaseId).realtimeTables() as unknown as RawRealtimeSubscriber[];
      setRealtimeTables(normalizeRealtimeTables(raw));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  return { realtimeTables, refreshRealtimeTables };
}
