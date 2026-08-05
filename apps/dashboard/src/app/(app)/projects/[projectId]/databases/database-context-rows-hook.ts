'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { normalizeQueryResult } from '@/lib/db-normalize';
import type { RawDataResult } from '@/lib/db-normalize';
import type { TableRowsState } from './database-context-types';

export function useDatabaseRows(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [rowsByTable, setRowsByTable] = useState<Record<string, TableRowsState>>({});

  const fetchRows = useCallback(async (table: string, opts: { page?: number; limit?: number } = {}) => {
    if (!databaseId) return;
    setRowsByTable(prev => ({ ...prev, [table]: { data: [], total: 0, loading: true, error: undefined } }));
    try {
      const sdk = getSdk();
      const raw = await sdk.database(databaseId).from(table)
        .limit(opts.limit ?? 50)
        .page(opts.page ?? 1)
        .select() as RawDataResult<Record<string, unknown>>;
      const result = normalizeQueryResult(raw);
      setRowsByTable(prev => ({
        ...prev,
        [table]: { data: result.rows, total: result.rowCount, loading: false },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRowsByTable(prev => ({
        ...prev,
        [table]: { data: [], total: 0, loading: false, error: msg },
      }));
    }
  }, [databaseId, getSdk]);

  return { rowsByTable, fetchRows };
}
