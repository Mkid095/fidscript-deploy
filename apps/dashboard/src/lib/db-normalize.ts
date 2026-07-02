/**
 * db-normalize.ts
 *
 * Adapter layer between the real FidscriptSDK API responses and the
 * dashboard's internal type system.
 *
 * PROBLEM: The dashboard types were written to match mock data and differ
 * from the real SDK's field names and shapes. This module normalizes real
 * API responses so the UI layer never needs to know about these differences.
 *
 * HOW IT WORKS:
 *   SDK method → raw response → normalizeXxx(raw) → dashboard type → context state
 *
 * All normalization functions are pure: input = raw API shape, output = dashboard shape.
 * Where the real API is missing fields (e.g. backup schedules), stubs return safe
 * defaults that match the dashboard type.
 */

// ─── Raw SDK types (what the real API actually returns) ───────────────────────

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

export interface RawMigrationRecord {
  id: number;
  name: string;
  checksum: string;
  appliedAt: string;
  executionTimeMs: number;
  appliedBy?: string | null;
  success: boolean;
}

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

export interface RawRealtimeSubscriber {
  schema: string;
  table: string;
  id: string;
  columns?: string[];
}

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

export interface RawDataResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export interface RawFunction {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
  envVars?: Record<string, string>;
  memoryMb?: number;
  timeoutSeconds?: number;
  currentVersion?: string;
  entryPoint?: string;
  settings?: Record<string, unknown>;
}

export interface RawDeployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  rolledBackToId: string | null;
  createdAt: string;
  completedAt: string | null;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  imageTag?: string;
  sourceUrl?: string;
  sourceType?: 'git' | 'archive';
  createdBy?: string;
}

// ─── Dashboard types (what the UI expects) ────────────────────────────────────
// These are re-exported from the real type file for convenience.

import type {
  Database,
  TableInfo,
  ColumnInfo,
  QueryResult,
  MigrationRecord,
  BackupRecord,
  RealtimeTableInfo,
  DatabaseStatus,
} from '@/types';
import type { Function_ } from '@/types';
import type { Deployment } from '@/types';

// ─── Normalizers ───────────────────────────────────────────────────────────────

/**
 * normalizeDatabase
 * Real API: RawDatabase fields (sizeBytes, no diskSizeMb, no region, no mode)
 * Dashboard: Database (diskSizeMb, region, mode, currentConnections)
 */
export function normalizeDatabase(raw: RawDatabase): Database {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    version: raw.version,
    status: raw.status,
    mode: 'single',                 // not in real API — safe default
    region: 'unknown',              // not in real API — resolved via connection() if needed
    projectId: raw.projectId,
    ownerId: raw.ownerId,
    environment: raw.environment,
    diskSizeMb: raw.sizeBytes ? Math.round(raw.sizeBytes / (1024 * 1024)) : 0,
    maxConnections: raw.maxConnections,
    currentConnections: 0,          // not in real Database type — resolved via status()
    sizeBytes: raw.sizeBytes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    connectionString: raw.connectionString,
  };
}

/**
 * normalizeMigrationRecord
 * Real API: id(number), checksum, executionTimeMs, success
 * Dashboard: id(string), version, status, source, error
 */
export function normalizeMigrationRecord(raw: RawMigrationRecord): MigrationRecord {
  return {
    id: String(raw.id),
    name: raw.name,
    version: raw.name.replace(/[^\d]/g, '').slice(0, 8) || raw.name,
    status: raw.success ? 'applied' : 'failed',
    appliedAt: raw.appliedAt,
    appliedBy: raw.appliedBy ?? undefined,
    error: raw.success ? undefined : 'Migration failed',
    source: raw.appliedBy?.includes('api') ? 'api'
        : raw.appliedBy?.includes('cli') || raw.appliedBy === 'CI pipeline' ? 'cli'
        : undefined,
  };
}

/**
 * normalizeColumnInfo
 * Real API: ordinalPosition, dataType, columnDefault, characterMaximumLength, isIdentity
 * Dashboard: type, isNullable, isPrimaryKey, isForeignKey, defaultValue, references
 */
export function normalizeColumnInfo(raw: RawColumnInfo): ColumnInfo {
  return {
    name: raw.name,
    type: raw.dataType,
    isNullable: raw.isNullable,
    isPrimaryKey: raw.isPrimaryKey,
    isForeignKey: false,             // not in real API — derived from constraints if needed
    defaultValue: raw.columnDefault,
  };
}

/**
 * normalizeQueryResult
 * Real API: DataResult { rows, total, page, limit }
 * Dashboard: QueryResult { columns, rows, rowCount, executionTimeMs }
 *
 * Note: This normalizes the LIVE query result object. For SQL editor results,
 * the context's runQuery already builds a QueryResult directly from the raw
 * SDK response (columns + rows + rowCount + timing) — no normalization needed there.
 * This normalizer is for the QueryBuilder path used by fetchRows.
 */
export function normalizeQueryResult<T>(
  raw: RawDataResult<T>,
  columns?: string[],
  executionTimeMs = 0,
): QueryResult {
  // Derive column names from the first row's keys if not provided
  const derivedColumns = columns ?? (raw.rows.length > 0 ? Object.keys(raw.rows[0] as object) : []);
  return {
    columns: derivedColumns,
    rows: raw.rows as Record<string, unknown>[],
    rowCount: raw.total,
    executionTimeMs,
  };
}

/**
 * normalizeRealtimeTables
 * Real API: RealtimeSubscriber[] { schema, table, id, columns }
 * Dashboard: RealtimeTableInfo[] { schema, table, subscribers }
 */
export function normalizeRealtimeTables(raw: RawRealtimeSubscriber[]): RealtimeTableInfo[] {
  // Group by table to count subscribers per table
  const map = new Map<string, RealtimeTableInfo>();
  for (const sub of raw) {
    const key = `${sub.schema}.${sub.table}`;
    const existing = map.get(key);
    if (existing) {
      existing.subscribers += 1;
    } else {
      map.set(key, { schema: sub.schema, table: sub.table, subscribers: 1 });
    }
  }
  return Array.from(map.values());
}

/**
 * normalizeBackupRecord
 * Real API: listBackups returns BackupRecord[] directly (wrapped in {backups:[]} by SDK)
 * Dashboard: BackupRecord with extra fields (versionLabel, type, scheduleId)
 *
 * Note: The real API doesn't return versionLabel, type, scheduleId.
 * We derive type='manual' for all records (scheduled ones would need
 * backend support for schedule metadata on backup records).
 */
export function normalizeBackupRecord(raw: RawBackupRecord): BackupRecord {
  return {
    id: raw.id,
    status: raw.status as BackupRecord['status'],
    sizeBytes: raw.sizeBytes,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt,
    error: raw.error,
    url: raw.url,
    storageBucket: raw.storageBucket,
    versionLabel: undefined,
    type: 'manual',                 // real API doesn't track this — scheduled backups need backend
    scheduleId: undefined,
  };
}

/**
 * normalizeFunction
 * Real API: RawFunction (missing invokedCount, avgDuration, lastInvokedAt)
 * Dashboard: Function_ with these extra fields
 *
 * The real SDK doesn't track invocation metrics — these are stubbed from
 * function logs when the real API adds them, or from /functions/:id/stats.
 */
export function normalizeFunction(raw: RawFunction): Function_ {
  return {
    id: raw.id,
    name: raw.name,
    runtime: raw.runtime,
    status: raw.status as Function_['status'],
    projectId: raw.projectId,
    createdAt: raw.createdAt,
    currentVersion: raw.currentVersion,
    envVars: raw.envVars,
    memoryMb: raw.memoryMb,
    timeoutSeconds: raw.timeoutSeconds,
    entryPoint: raw.entryPoint,
    settings: raw.settings,
    // Metrics not in real API yet — stubbed
    invokedCount: 0,
    avgDuration: undefined,
    lastInvokedAt: null,
  };
}

/**
 * normalizeDeployment
 * Real API: RawDeployment
 * Dashboard: Deployment (very close — only 'version' is extra)
 *
 * The 'version' field maps to imageTag in the real API.
 */
export function normalizeDeployment(raw: RawDeployment): Deployment {
  return {
    id: raw.id,
    projectId: raw.projectId,
    releaseId: raw.releaseId,
    status: raw.status,
    deploymentUrl: raw.deploymentUrl,
    rolledBackToId: raw.rolledBackToId,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt,
    version: raw.imageTag,           // real API uses imageTag, dashboard uses version
    commitSha: raw.commitSha,
    commitMessage: raw.commitMessage,
    branch: raw.branch,
    imageTag: raw.imageTag,
    sourceUrl: raw.sourceUrl,
    sourceType: raw.sourceType,
    createdBy: raw.createdBy,
  };
}

/**
 * normalizeDatabaseStatus
 * Real API: /status endpoint returns unknown shape
 * Dashboard: DatabaseStatus { healthy, currentConnections, maxConnections, region, version, uptimeSeconds, totalSizeMb }
 *
 * The real API's /status likely returns sizeBytes — we convert to totalSizeMb.
 * Stub: region comes from connection() if needed.
 */
export function normalizeDatabaseStatus(
  raw: Record<string, unknown>,
): DatabaseStatus {
  const sizeBytes = (raw.sizeBytes as number) ?? 0;
  return {
    healthy: (raw.healthy as boolean) ?? true,
    currentConnections: (raw.currentConnections as number) ?? 0,
    maxConnections: (raw.maxConnections as number) ?? 0,
    region: (raw.region as string) ?? 'unknown',
    version: (raw.version as string) ?? '',
    uptimeSeconds: (raw.uptimeSeconds as number) ?? 0,
    totalSizeMb: (raw.totalSizeMb as number) ?? Math.round(sizeBytes / (1024 * 1024)),
  };
}
