/**
 * Database type definitions — split out of databases.ts for ANPAS 150-line limit.
 */

export type BackupScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  timeUtc: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  retentionCount: number;
  storageBucket: string;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface BackupSettings {
  defaultBucket: string;
  maxManualBackups: number;
  autoBackupRetentionDays: number;
}

export interface Database {
  id: string;
  projectId: string;
  ownerId?: string;
  name: string;
  environment: string;
  type: string;
  version: string;
  status: string;
  sizeBytes: number;
  maxConnections: number;
  createdAt: string;
  updatedAt: string;
  connectionString?: string;
}

export interface RealtimeEvent<T = unknown> {
  version: 1;
  organizationId?: string;
  projectId: string;
  environmentId?: string;
  databaseId: string;
  schema: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  new: T | null;
  old: T | null;
  timestamp: string;
  xid?: number;
}

export interface RealtimeSubscription {
  unsubscribe(): Promise<void>;
}

export type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'notIn';

export interface DataResult<T = unknown> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LiveQueryResult<T = unknown> {
  rows: T[];
  push(rows: T[]): void;
  subscribe(callback: (rows: T[]) => void): () => void;
  unsubscribe(): Promise<void>;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view';
  rowCount?: number;
  sizeBytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  ordinalPosition: number;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string | null;
  characterMaximumLength?: number | null;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  comment?: string | null;
}

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
  appliedBy?: string | null;
  success: boolean;
}