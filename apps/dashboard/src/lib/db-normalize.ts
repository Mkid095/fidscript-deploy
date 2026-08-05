/**
 * db-normalize.ts
 *
 * Barrel for the database normalizers. Each normalizer lives in its own
 * domain file (db-normalize-database.ts, db-normalize-schema.ts,
 * db-normalize-migrations.ts, db-normalize-backups.ts). The raw SDK
 * shapes live in db-normalize-types.ts.
 *
 *   SDK method → raw response → normalizeXxx(raw) → dashboard type → context state
 *
 * Importing from this file preserves the historical import path
 * (`@/lib/db-normalize`) — see callers under
 *   src/app/(app)/projects/[projectId]/databases/
 *   src/components/database/backups-hooks.ts
 */

export type {
  RawBackupRecord,
  RawColumnInfo,
  RawDataResult,
  RawDatabase,
  RawMigrationRecord,
  RawRealtimeSubscriber,
} from './db-normalize-types';

export { normalizeDatabase, normalizeDatabaseStatus } from './db-normalize-database';
export { normalizeColumnInfo, normalizeQueryResult, normalizeRealtimeTables } from './db-normalize-schema';
export { normalizeMigrationRecord } from './db-normalize-migrations';
export { normalizeBackupRecord } from './db-normalize-backups';