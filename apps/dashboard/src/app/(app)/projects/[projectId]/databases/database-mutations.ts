'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { QueryHistoryEntry, QueryResult } from '@/types';
import {
  buildEmptyQueryResult,
  buildErrorHistoryEntry,
  buildErrorResult,
  buildSuccessHistoryEntry,
  QUERY_HISTORY_MAX,
  timestampLog,
} from './database-utils';

export interface DatabaseQueryHandlers {
  setQueryRunning: (running: boolean) => void;
  setQueryResult: (result: QueryResult | null) => void;
  appendQueryLog: (message: string) => void;
  setQueryHistory: (next: QueryHistoryEntry[] | ((prev: QueryHistoryEntry[]) => QueryHistoryEntry[])) => void;
}

export function useDatabaseMutations(databaseId: string | null) {
  const { getSdk } = useAuth();

  const insertRow = useCallback(async (table: string, row: Record<string, unknown>) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try { await getSdk().database(databaseId).from(table).insert(row); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
  }, [databaseId, getSdk]);

  const updateRow = useCallback(async (table: string, pkValue: unknown, patch: Record<string, unknown>) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try { await getSdk().database(databaseId).from(table).eq('id', pkValue).update(patch); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
  }, [databaseId, getSdk]);

  const deleteRows = useCallback(async (table: string, ids: unknown[]) => {
    if (!databaseId) return { success: false, error: 'No database selected' };
    try { await getSdk().database(databaseId).from(table).eq('id', ids[0]).delete(); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : String(error) }; }
  }, [databaseId, getSdk]);

  const runQuery = useCallback(async (sql: string, handlers: DatabaseQueryHandlers): Promise<QueryResult> => {
    if (!databaseId) return buildEmptyQueryResult();
    handlers.setQueryRunning(true);
    handlers.setQueryResult(null);
    handlers.appendQueryLog(timestampLog('Connecting…').message);
    handlers.appendQueryLog(timestampLog('Executing query…').message);
    handlers.appendQueryLog(timestampLog('Fetching rows…').message);
    const start = Date.now();
    try {
      const result = await getSdk().database(databaseId).query(sql) as QueryResult;
      handlers.setQueryResult(result);
      handlers.appendQueryLog(timestampLog(`Query completed. ${result.rowCount} row(s) returned.`).message);
      handlers.setQueryHistory(prev => [buildSuccessHistoryEntry(sql, result.rowCount, Date.now() - start), ...prev].slice(0, QUERY_HISTORY_MAX));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorResult = buildErrorResult(message, Date.now() - start);
      handlers.setQueryResult(errorResult);
      handlers.appendQueryLog(timestampLog(`ERROR: ${message}`).message);
      handlers.setQueryHistory(prev => [buildErrorHistoryEntry(sql, Date.now() - start), ...prev].slice(0, QUERY_HISTORY_MAX));
      return errorResult;
    } finally { handlers.setQueryRunning(false); }
  }, [databaseId, getSdk]);

  return { insertRow, updateRow, deleteRows, runQuery };
}
