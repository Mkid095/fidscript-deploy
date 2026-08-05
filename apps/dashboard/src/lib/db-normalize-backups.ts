/**
 * db-normalize-backups.ts
 *
 * Adapter for the database backups endpoint.
 *
 * Real API: listBackups returns BackupRecord[] directly (wrapped in {backups:[]} by SDK)
 * Dashboard: BackupRecord with extra fields (versionLabel, type, scheduleId)
 *
 * Note: The real API doesn't return versionLabel, type, scheduleId.
 * We derive type='manual' for all records (scheduled ones would need
 * backend support for schedule metadata on backup records).
 */

import type { BackupRecord } from '@/types';
import type { RawBackupRecord } from './db-normalize-types';

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