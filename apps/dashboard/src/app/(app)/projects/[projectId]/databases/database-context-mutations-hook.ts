'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

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

  const deleteRows = useCallback(async (table: string, ids: unknown[], primaryKey = 'id') => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    if (ids.length === 0) return { success: false, error: 'No rows selected' };
    try {
      const sdk = getSdk();
      const query = ids.length === 1
        ? sdk.database(databaseId).from(table).eq(primaryKey, ids[0])
        : sdk.database(databaseId).from(table).in(primaryKey, ids as unknown[]);
      await (query.delete() as Promise<number>);
      await fetchRows(table);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [databaseId, getSdk, fetchRows]);

  return { insertRow, updateRow, deleteRows };
}
