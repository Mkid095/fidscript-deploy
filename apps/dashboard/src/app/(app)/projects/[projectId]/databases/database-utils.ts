import type { BackupSchedule, ColumnInfo, Database, DatabaseStatus, MigrationRecord, QueryResult, RealtimeTableInfo, TableInfo } from '@/types';

export const QUERY_HISTORY_MAX = 50;

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

export interface DatabaseStatusShape {
  healthy: boolean;
  currentConnections: number;
  maxConnections: number;
  region: string;
  version: string;
  uptimeSeconds: number;
  totalSizeMb: number;
}

export interface RealtimeTableInfoShape {
  schema: string;
  table: string;
  subscribers: number;
}

export interface DatabaseBackupSettings {
  defaultBucket: string;
  maxManualBackups: number;
  autoBackupRetentionDays: number;
}

export interface DatabaseModuleExt {
  getBackupSchedule(databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
  getBackupSettings(databaseId: string): Promise<DatabaseBackupSettings>;
}

export interface QueryLogEntry {
  time: string;
  message: string;
}

export function timestampLog(message: string): QueryLogEntry {
  return { time: new Date().toLocaleTimeString(), message };
}

export function buildEmptyQueryResult(): QueryResult {
  return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
}

export function buildErrorResult(message: string, elapsedMs: number): QueryResult {
  return { columns: [`Error: ${message}`], rows: [], rowCount: 0, executionTimeMs: elapsedMs };
}

export function buildSuccessHistoryEntry(sql: string, rowCount: number, durationMs: number) {
  return {
    id: crypto.randomUUID(),
    sql,
    status: 'success' as const,
    rowCount,
    durationMs,
    executedAt: new Date().toISOString(),
  };
}

export function buildErrorHistoryEntry(sql: string, durationMs: number) {
  return {
    id: crypto.randomUUID(),
    sql,
    status: 'error' as const,
    rowCount: 0,
    durationMs,
    executedAt: new Date().toISOString(),
  };
}

export function createSavedQuery(name: string, sql: string): SavedQuery {
  return { id: crypto.randomUUID(), name, sql, createdAt: new Date().toISOString() };
}

export type { Database, BackupSchedule, ColumnInfo, DatabaseStatus, MigrationRecord, RealtimeTableInfo, TableInfo };
