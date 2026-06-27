'use client';
/* eslint-disable import/order */


/**
 * DatabaseProvider — central store for the database dashboard.
 * Holds: database, schema (tables), selected table, rows cache,
 *        realtime subscriptions, query results.
 *
 * Designed as a Context (instead of Zustand) to avoid adding deps.
 * Sub-pages consume the same instance via useDatabase() — no refetching
 * when switching tabs.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Database, TableInfo } from '@fidscript/sdk';

interface QueryResult {
  rows: any[];
  rowCount: number;
  executionTimeMs: number;
  columns?: string[];
}

interface TableRowsState {
  data: any[];
  total: number;
  loading: boolean;
  error?: string;
}

interface DatabaseContextValue {
  // Project + database identity
  projectId: string;
  databaseId: string;

  // Database + schema
  database: Database | null;
  setDatabase: (db: Database | null) => void;
  schema: TableInfo[];
  setSchema: (s: TableInfo[]) => void;
  selectedTable: string | null;
  selectTable: (t: string | null) => void;
  loadingSchema: boolean;
  refreshSchema: () => Promise<void>;

  // Rows cache (keyed by table name)
  rowsByTable: Record<string, TableRowsState>;
  fetchRows: (table: string, opts?: { page?: number; limit?: number; where?: Record<string, any> }) => Promise<void>;

  // SQL Editor
  queryResult: QueryResult | null;
  setQueryResult: (r: QueryResult | null) => void;
  runQuery: (sql: string) => Promise<void>;
  queryRunning: boolean;

  // Realtime subscriptions
  realtimeTables: { schema: string; table: string; subscribers: number }[];
  refreshRealtimeTables: () => Promise<void>;
  enableRealtime: (table: string) => Promise<void>;
  disableRealtime: (table: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({
  projectId, databaseId, children,
}: {
  projectId: string;
  databaseId: string;
  children: React.ReactNode;
}) {
  const { getSdk } = useAuth();
  const [database, setDatabase] = useState<Database | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [selectedTable, selectTable] = useState<string | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [rowsByTable, setRowsByTable] = useState<Record<string, TableRowsState>>({});
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [realtimeTables, setRealtimeTables] = useState<{ schema: string; table: string; subscribers: number }[]>([]);

  const refreshSchema = useCallback(async () => {
    if (!databaseId) return;
    setLoadingSchema(true);
    try {
      const sdk = getSdk();
      const db = sdk.database(databaseId);
      const [dbInfo, tables] = await Promise.all([
        sdk.databases.get(databaseId).catch(() => null),
        db.schema(),
      ]);
      if (dbInfo) setDatabase(dbInfo);
      setSchema(tables);
    } catch (err) {
      console.error('refreshSchema failed', err);
    } finally {
      setLoadingSchema(false);
    }
  }, [databaseId, getSdk]);

  const fetchRows = useCallback(async (table: string, opts: { page?: number; limit?: number; where?: Record<string, any> } = {}) => {
    if (!databaseId) return;
    setRowsByTable(prev => ({ ...prev, [table]: { ...prev[table], loading: true, error: undefined } }));
    try {
      const sdk = getSdk();
      const result = await sdk.database(databaseId).from(table)
        .limit(opts.limit ?? 50)
        .page(opts.page ?? 1)
        .select();
      setRowsByTable(prev => ({
        ...prev,
        [table]: { data: result.rows, total: result.total, loading: false },
      }));
    } catch (err: any) {
      setRowsByTable(prev => ({
        ...prev,
        [table]: { data: [], total: 0, loading: false, error: err.message },
      }));
    }
  }, [databaseId, getSdk]);

  const runQuery = useCallback(async (sql: string) => {
    if (!databaseId) return;
    setQueryRunning(true);
    setQueryResult(null);
    try {
      const sdk = getSdk();
      const result: any = await sdk.database(databaseId).query(sql);
      setQueryResult({
        rows: result.rows,
        rowCount: result.rowCount,
        executionTimeMs: result.executionTimeMs,
        columns: result.columns,
      });
    } catch (err: any) {
      setQueryResult({
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        columns: [`Error: ${err.message}`],
      });
    } finally {
      setQueryRunning(false);
    }
  }, [databaseId, getSdk]);

  const refreshRealtimeTables = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const tables = await sdk.database(databaseId).realtimeTables();
      setRealtimeTables(tables);
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  const enableRealtime = useCallback(async (table: string) => {
    if (!databaseId) return;
    const sdk = getSdk();
    await sdk.database(databaseId).from(table).subscribe(() => {
      // when table changes, refresh the rows
      fetchRows(table);
    });
    await refreshRealtimeTables();
  }, [databaseId, getSdk, fetchRows, refreshRealtimeTables]);

  const disableRealtime = useCallback(async (table: string) => {
    if (!databaseId) return;
    // The realtime disable endpoint decrements the refcount; for the dashboard
    // we just refresh the list.
    await refreshRealtimeTables();
  }, [databaseId, refreshRealtimeTables]);

  // Auto-load schema when databaseId changes
  useEffect(() => {
    if (databaseId) {
      refreshSchema();
      refreshRealtimeTables();
    }
  }, [databaseId, refreshSchema, refreshRealtimeTables]);

  const value = useMemo<DatabaseContextValue>(() => ({
    projectId, databaseId,
    database, setDatabase,
    schema, setSchema,
    selectedTable, selectTable,
    loadingSchema, refreshSchema,
    rowsByTable, fetchRows,
    queryResult, setQueryResult, runQuery, queryRunning,
    realtimeTables, refreshRealtimeTables, enableRealtime, disableRealtime,
  }), [projectId, databaseId, database, schema, selectedTable, loadingSchema, refreshSchema,
       rowsByTable, fetchRows, queryResult, runQuery, queryRunning, realtimeTables,
       refreshRealtimeTables, enableRealtime, disableRealtime]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
