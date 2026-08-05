/**
 * db-normalize-types.ts
 *
 * Raw SDK response shapes for the database subsystem.
 * These mirror what the real FidscriptSDK endpoints return — they may
 * differ from the dashboard's internal types (see ./db-normalize-*.ts).
 */

// ─── Database ─────────────────────────────────────────────────────────────────

export interface RawDatabase {
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

// ─── Status ───────────────────────────────────────────────────────────────────

// Shape is unknown upstream; status normalizer takes a Record.
// See db-normalize-database.ts → normalizeDatabaseStatus.

// ─── Schema / Query ───────────────────────────────────────────────────────────

export interface RawColumnInfo {
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

export interface RawDataResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export interface RawRealtimeSubscriber {
  schema: string;
  table: string;
  id: string;
  columns?: string[];
}

// ─── Migrations ───────────────────────────────────────────────────────────────

export interface RawMigrationRecord {
  id: number;
  name: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
  appliedBy?: string | null;
  success: boolean;
}

// ─── Backups ──────────────────────────────────────────────────────────────────

export interface RawBackupRecord {
  id: string;
  status: string;
  sizeBytes: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  url?: string;
  storageBucket?: string;
}