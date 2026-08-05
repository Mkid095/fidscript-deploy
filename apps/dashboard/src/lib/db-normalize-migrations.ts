/**
 * db-normalize-migrations.ts
 *
 * Adapter for the migration history endpoint.
 *
 * Real API: id(number), checksum, executionTimeMs, success
 * Dashboard: id(string), version, status, source, error
 */

import type { MigrationRecord } from '@/types';
import type { RawMigrationRecord } from './db-normalize-types';

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