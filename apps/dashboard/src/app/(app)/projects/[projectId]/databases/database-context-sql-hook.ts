'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { QueryResult, QueryHistoryEntry } from '@/types';

const QUERY_HISTORY_MAX = 50;

export function useDatabaseSql(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [queryLogs, setQueryLogs] = useState<string[]>([]);

  const runQuery = useCallback(async (sql: string): Promise<QueryResult> => {
    if (!databaseId) {
      const empty: QueryResult = { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
      return empty;
    }
    setQueryRunning(true);
    setQueryResult(null);
    setQueryLogs([`[${new Date().toLocaleTimeString()}] Connecting…`]);
    const start = Date.now();
    try {
      setQueryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing query…`]);
      const sdk = getSdk();
      setQueryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fetching rows…`]);
      const result = await sdk.database(databaseId).query(sql) as QueryResult;
      setQueryResult(result);
      setQueryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Query completed. ${result.rowCount} row(s) returned.`]);
      setQueryHistory(prev => [{
        id: crypto.randomUUID(),
        sql,
        status: 'success' as const,
        rowCount: result.rowCount,
        durationMs: Date.now() - start,
        executedAt: new Date().toISOString(),
      }, ...prev].slice(0, QUERY_HISTORY_MAX));
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorResult: QueryResult = { columns: [`Error: ${msg}`], rows: [], rowCount: 0, executionTimeMs: Date.now() - start };
      setQueryResult(errorResult);
      setQueryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${msg}`]);
      setQueryHistory(prev => [{
        id: crypto.randomUUID(),
        sql,
        status: 'error' as const,
        rowCount: 0,
        durationMs: Date.now() - start,
        executedAt: new Date().toISOString(),
      }, ...prev].slice(0, QUERY_HISTORY_MAX));
      return errorResult;
    } finally {
      setQueryRunning(false);
    }
  }, [databaseId, getSdk]);

  const clearLogs = useCallback(() => setQueryLogs([]), []);
  const appendLog = useCallback((msg: string) => setQueryLogs(prev => [...prev, msg]), []);
  const clearHistory = useCallback(() => setQueryHistory([]), []);

  return { queryResult, queryRunning, queryHistory, runQuery, clearHistory, queryLogs, clearLogs, appendLog };
}
