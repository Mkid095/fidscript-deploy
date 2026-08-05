'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export function useDatabaseColumns(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [columnsCache, setColumnsCache] = useState<Record<string, import('@/types').ColumnInfo[]>>({});

  const fetchColumns = useCallback(async (table: string) => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const cols = await sdk.database(databaseId).columns(table) as unknown as import('@/types').ColumnInfo[];
      setColumnsCache(prev => ({ ...prev, [table]: cols }));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  return { columnsCache, fetchColumns };
}
