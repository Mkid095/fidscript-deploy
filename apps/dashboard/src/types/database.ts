// Database types

export type DatabaseStatusValue = 'healthy' | 'degraded' | 'readonly' | 'offline' | string;

export interface DatabaseStatus {
  healthy: boolean;
  currentConnections: number;
  maxConnections: number;
  region: string;
  version: string;
  uptimeSeconds: number;
  totalSizeMb: number;
}

export type DatabaseMode = 'single' | 'ha' | 'serverless';

export type ColumnType =
  | 'bigint' | 'bigserial' | 'boolean' | 'char' | 'citext' | 'date'
  | 'decimal' | 'float4' | 'float8' | 'inet' | 'integer' | 'interval'
  | 'json' | 'jsonb' | 'numeric' | 'oid' | 'real' | 'serial'
  | 'smallint' | 'smallserial' | 'text' | 'time' | 'timestamp' | 'timestamptz'
  | 'timetz' | 'uuid' | 'varchar' | 'xml';

export interface Database {
  id: string;
  name: string;
  type: 'postgres' | string;
  version: string;
  status: DatabaseStatusValue;
  mode: DatabaseMode;
  region: string;
  projectId: string;
  ownerId?: string;
  environment?: string;
  diskSizeMb: number;
  maxConnections: number;
  currentConnections: number;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  connectionString?: string;
  passwordLastRotatedAt?: string;
  branchFrom?: string;
  parentId?: string;
  role?: string;
}

export interface DatabaseBranch {
  id: string;
  name: string;
  parentId: string;
  status: 'active' | 'creating' | 'restoring' | 'failed';
  createdAt: string;
  diskSizeMb: number;
}

export interface TableInfo {
  schema: string;
  name: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount?: number;
  sizeBytes?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: string | null;
  references?: { table: string; column: string };
  comment?: string;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin' | string;
}

export interface ConstraintInfo {
  name: string;
  table: string;
  type: 'p' | 'u' | 'c' | 'f' | 'x';
  columns: string[];
  definition: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  status: 'success' | 'error';
  rowCount: number;
  durationMs: number;
  executedAt: string;
}

export interface MigrationRecord {
  id: string;
  name: string;
  status: 'applied' | 'pending' | 'failed';
  appliedAt?: string;
  error?: string;
  version: string;
  source?: 'api' | 'cli' | 'manual';
  appliedBy?: string;
}
