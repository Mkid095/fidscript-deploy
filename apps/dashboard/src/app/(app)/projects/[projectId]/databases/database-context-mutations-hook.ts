'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { RawDataResult } from '@/lib/db-normalize';

export function useDatabaseMutations(databaseId: string | null, fetchRows: (table: string) => Promise<void>) {
  const { getSdk } = useAuth();

  const insertRow = useCallback(async (table: string, row: Record<string, unknown>) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try {
      const sdk = getSdk();
      await (sdk.database(databaseId).from(table).insert(row) as Promise<unknown>);
      await fetchRows(table);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [databaseId, getSdk, fetchRows]);

  const updateRow = useCallback(async (table: string, pkValue: unknown, patch: Record<string, unknown>) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try {
      const sdk = getSdk();
      await (sdk.database(databaseId).from(table).eq('id', pkValue).update(patch) as Promise<unknown>);
      await fetchRows(table);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [databaseId, getSdk, fetchRows]);

  const deleteRows = useCallback(async (table: string, ids: unknown[]) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try {
      const sdk = getSdk();
      await (sdk.database(databaseId).from(table).eq('id', ids[0]).delete() as Promise<number>);
      await fetchRows(table);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [databaseId, getSdk, fetchRows]);

  return { insertRow, updateRow, deleteRows };
}
