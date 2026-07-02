'use client';

/**
 * DatabaseProvider — central store for the database dashboard.
 * Mirrors the real FidscriptSDK's DatabaseProvider interface where possible.
 * Some extended features (indexes, constraints) are only available in mock mode.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  normalizeDatabase,
  normalizeMigrationRecord,
  normalizeQueryResult,
  normalizeDatabaseStatus,
  normalizeRealtimeTables,
  type RawDataResult,
  type RawMigrationRecord,
  type RawRealtimeSubscriber,
} from '@/lib/db-normalize';
import type {
  Database,
  TableInfo,
  ColumnInfo,
  QueryResult,
  QueryHistoryEntry,
  MigrationRecord,
  BackupSchedule,
} from '@/types';

// ─── Local types ───────────────────────────────────────────────────────────────

interface TableRowsState {
  data: Record<string, unknown>[];
  total: number;
  loading: boolean;
  error?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
}

export interface DatabaseStatus {
  healthy: boolean;
  currentConnections: number;
  maxConnections: number;
  region: string;
  version: string;
  uptimeSeconds: number;
  totalSizeMb: number;
}

// Shape returned by the real SDK's realtimeTables()
export interface RealtimeTableInfo {
  schema: string;
  table: string;
  subscribers: number;
}

// Extended DatabasesModule interface — includes backup scheduling methods that may not
// exist in all versions of the @fidscript/sdk package. Cast sdk.databases to this
// type when calling these methods so TypeScript doesn't complain.
interface DatabasesModuleExt {
  getBackupSchedule(databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
  getBackupSettings(databaseId: string): Promise<{ defaultBucket: string; maxManualBackups: number; autoBackupRetentionDays: number }>;
}

interface DatabaseContextValue {
  projectId: string;
  databaseId: string | null;

  // Database + schema
  database: Database | null;
  setDatabase: (db: Database | null) => void;
  schema: TableInfo[];
  refreshSchema: () => Promise<void>;
  loadingSchema: boolean;

  // Selected table
  selectedTable: string | null;
  selectTable: (t: string | null) => void;

  // Rows cache
  rowsByTable: Record<string, TableRowsState>;
  fetchRows: (table: string, opts?: { page?: number; limit?: number }) => Promise<void>;

  // Column metadata
  columnsCache: Record<string, import('@/types').ColumnInfo[]>;
  fetchColumns: (table: string) => Promise<void>;

  // Row mutations
  insertRow: (table: string, row: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  updateRow: (table: string, pkValue: unknown, patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteRows: (table: string, ids: unknown[]) => Promise<{ success: boolean; error?: string }>;

  // SQL Editor
  queryResult: QueryResult | null;
  runQuery: (sql: string) => Promise<QueryResult>;
  queryRunning: boolean;
  queryHistory: QueryHistoryEntry[];
  clearHistory: () => void;
  queryLogs: string[];
  appendLog: (msg: string) => void;
  clearLogs: () => void;

  // Saved queries
  savedQueries: SavedQuery[];
  saveQuery: (name: string, sql: string) => void;
  deleteSavedQuery: (id: string) => void;

  // Connection & status
  dbStatus: DatabaseStatus | null;
  refreshStatus: () => Promise<void>;

  // Migrations
  migrations: MigrationRecord[];
  refreshMigrations: () => Promise<void>;
  applyMigration: (sql: string, name?: string, source?: 'api' | 'cli' | 'manual') => Promise<void>;

  // Backup schedules
  backupSchedule: BackupSchedule | null;
  refreshBackupSchedule: () => Promise<void>;
  updateBackupSchedule: (schedule: Partial<BackupSchedule> & { frequency: string }) => Promise<void>;

  // Realtime
  realtimeTables: RealtimeTableInfo[];
  refreshRealtimeTables: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

const QUERY_HISTORY_MAX = 50;

export function DatabaseProvider({
  projectId, databaseId, children,
}: {
  projectId: string;
  databaseId: string;
  children: React.ReactNode;
}) {
  const { getSdk } = useAuth();

  // Core database state
  const [database, setDatabase] = useState<Database | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [selectedTable, selectTable] = useState<string | null>(null);

  // Rows cache
  const [rowsByTable, setRowsByTable] = useState<Record<string, TableRowsState>>({});

  // Column metadata cache
  const [columnsCache, setColumnsCache] = useState<Record<string, import('@/types').ColumnInfo[]>>({});

  // SQL results
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queryLogs, setQueryLogs] = useState<string[]>([]);

  // Status + migrations
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);

  // Backup schedule
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null);

  // Realtime
  const [realtimeTables, setRealtimeTables] = useState<RealtimeTableInfo[]>([]);

  // ── Schema ──────────────────────────────────────────────────────────────────

  const refreshSchema = useCallback(async () => {
    if (!databaseId) return;
    setLoadingSchema(true);
    try {
      const sdk = getSdk();
      const [dbInfo, tables] = await Promise.all([
        sdk.databases.get(databaseId).catch(() => null),
        sdk.database(databaseId).schema() as Promise<TableInfo[]>,
      ]);
      if (dbInfo) setDatabase(normalizeDatabase(dbInfo as unknown as Parameters<typeof normalizeDatabase>[0]));
      setSchema(tables);
    } catch (err) {
      console.error('refreshSchema failed', err);
    } finally {
      setLoadingSchema(false);
    }
  }, [databaseId, getSdk]);

  // ── Rows ────────────────────────────────────────────────────────────────────

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

  // ── Columns ─────────────────────────────────────────────────────────────────

  const fetchColumns = useCallback(async (table: string) => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const cols = await sdk.database(databaseId).columns(table) as unknown as import('@/types').ColumnInfo[];
      setColumnsCache(prev => ({ ...prev, [table]: cols }));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  // ── Row mutations ────────────────────────────────────────────────────────────

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

  // ── SQL Editor ──────────────────────────────────────────────────────────────

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

  // ── Saved queries ───────────────────────────────────────────────────────────

  const saveQuery = useCallback((name: string, sql: string) => {
    setSavedQueries(prev => [{
      id: crypto.randomUUID(),
      name,
      sql,
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const deleteSavedQuery = useCallback((id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  }, []);

  // ── Status ──────────────────────────────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const raw = await sdk.database(databaseId).status() as Record<string, unknown>;
      setDbStatus(normalizeDatabaseStatus(raw));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  // ── Migrations ───────────────────────────────────────────────────────────────

  const refreshMigrations = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const recs = await sdk.database(databaseId).migrations() as unknown as RawMigrationRecord[];
      setMigrations(recs.map(normalizeMigrationRecord));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  const applyMigration = useCallback(async (sql: string, name?: string, source?: 'api' | 'cli' | 'manual') => {
    if (!databaseId) return;
    const sdk = getSdk();
    // Pass source to API if supported; the SDK call ignores extra fields so this is safe
    const result = await sdk.database(databaseId).applyMigration(sql, name) as unknown as RawMigrationRecord;
    // After applying, the API record may not include our source — normalize and re-fetch
    void result;
    await refreshMigrations();
  }, [databaseId, getSdk, refreshMigrations]);

  // ── Backup schedule ─────────────────────────────────────────────────────────

  const refreshBackupSchedule = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const schedule = await (sdk.databases as unknown as DatabasesModuleExt).getBackupSchedule(databaseId) as BackupSchedule | null;
      setBackupSchedule(schedule);
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  const updateBackupSchedule = useCallback(async (schedule: Partial<BackupSchedule> & { frequency: string }) => {
    if (!databaseId) return;
    const sdk = getSdk();
    const updated = await (sdk.databases as unknown as DatabasesModuleExt).updateBackupSchedule(databaseId, schedule) as BackupSchedule;
    setBackupSchedule(updated);
  }, [databaseId, getSdk]);

  // ── Realtime ────────────────────────────────────────────────────────────────

  const refreshRealtimeTables = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const raw = await sdk.database(databaseId).realtimeTables() as unknown as RawRealtimeSubscriber[];
      setRealtimeTables(normalizeRealtimeTables(raw));
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  // Auto-load schema + status when databaseId changes
  useEffect(() => {
    if (databaseId) {
      refreshSchema();
      refreshStatus();
      refreshMigrations();
      refreshRealtimeTables();
      refreshBackupSchedule();
    }
  }, [databaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<DatabaseContextValue>(() => ({
    projectId, databaseId,
    database, setDatabase,
    schema, refreshSchema, loadingSchema,
    selectedTable, selectTable,
    rowsByTable, fetchRows,
    columnsCache, fetchColumns,
    insertRow, updateRow, deleteRows,
    queryResult, runQuery, queryRunning, queryHistory, clearHistory,
    queryLogs, clearLogs, appendLog,
    savedQueries, saveQuery, deleteSavedQuery,
    dbStatus, refreshStatus,
    migrations, refreshMigrations, applyMigration,
    backupSchedule, refreshBackupSchedule, updateBackupSchedule,
    realtimeTables, refreshRealtimeTables,
  }), [projectId, databaseId, database, schema, loadingSchema, selectedTable,
       rowsByTable, columnsCache, queryResult, queryRunning, queryHistory, savedQueries,
       dbStatus, migrations, backupSchedule, realtimeTables, queryLogs,
       refreshSchema, fetchRows, fetchColumns, insertRow, updateRow, deleteRows, runQuery,
       clearHistory, clearLogs, appendLog, saveQuery, deleteSavedQuery, refreshStatus, refreshMigrations,
       applyMigration, refreshBackupSchedule, updateBackupSchedule, refreshRealtimeTables]);

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
