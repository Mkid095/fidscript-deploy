'use client';

import type {
  Database,
  TableInfo,
  QueryResult,
  QueryHistoryEntry,
  MigrationRecord,
  BackupSchedule,
} from '@/types';

// ─── Local types ───────────────────────────────────────────────────────────────

export interface TableRowsState {
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

export interface RealtimeTableInfo {
  schema: string;
  table: string;
  subscribers: number;
}

export interface DatabaseContextValue {
  projectId: string;
  databaseId: string | null;
  database: Database | null;
  setDatabase: (db: Database | null) => void;
  schema: TableInfo[];
  refreshSchema: () => Promise<void>;
  loadingSchema: boolean;
  selectedTable: string | null;
  selectTable: (t: string | null) => void;
  rowsByTable: Record<string, TableRowsState>;
  fetchRows: (table: string, opts?: { page?: number; limit?: number }) => Promise<void>;
  columnsCache: Record<string, import('@/types').ColumnInfo[]>;
  fetchColumns: (table: string) => Promise<void>;
  insertRow: (table: string, row: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  updateRow: (table: string, pkValue: unknown, patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  deleteRows: (table: string, ids: unknown[]) => Promise<{ success: boolean; error?: string }>;
  queryResult: QueryResult | null;
  runQuery: (sql: string) => Promise<QueryResult>;
  queryRunning: boolean;
  queryHistory: QueryHistoryEntry[];
  clearHistory: () => void;
  queryLogs: string[];
  appendLog: (msg: string) => void;
  clearLogs: () => void;
  savedQueries: SavedQuery[];
  saveQuery: (name: string, sql: string) => void;
  deleteSavedQuery: (id: string) => void;
  dbStatus: DatabaseStatus | null;
  refreshStatus: () => Promise<void>;
  migrations: MigrationRecord[];
  refreshMigrations: () => Promise<void>;
  applyMigration: (sql: string, name?: string, source?: 'api' | 'cli' | 'manual') => Promise<void>;
  backupSchedule: BackupSchedule | null;
  refreshBackupSchedule: () => Promise<void>;
  updateBackupSchedule: (schedule: Partial<BackupSchedule> & { frequency: string }) => Promise<void>;
  realtimeTables: RealtimeTableInfo[];
  refreshRealtimeTables: () => Promise<void>;
}
