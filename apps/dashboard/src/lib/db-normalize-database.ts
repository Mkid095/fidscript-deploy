/**
 * db-normalize-database.ts
 *
 * Adapters from the raw SDK database shapes to the dashboard `Database` /
 * `DatabaseStatus` types. Each function is pure: input = raw API shape,
 * output = dashboard shape.
 */

import type { Database, DatabaseStatus } from '@/types';
import type { RawDatabase } from './db-normalize-types';

/**
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
 * Real API: /status endpoint returns unknown shape
 * Dashboard: DatabaseStatus { healthy, currentConnections, maxConnections,
 *                            region, version, uptimeSeconds, totalSizeMb }
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