'use client';

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export interface DatabaseBackup {
  id: string;
  databaseId: string;
  sizeBytes: number;
  createdAt: string;
}

interface UseDatabaseBackupsOptions {
  databaseId: string;
  /** The project the database belongs to — the backups live under it. */
  projectId?: string | null;
  getSdk: () => FidscriptSDK;
  /** The list is refreshed after a backup or a restore. */
  onBackups: (backups: DatabaseBackup[]) => void;
  notify: (message: string, type: 'success' | 'error') => void;
}

/**
 * A database's backups — taking one, and restoring one.
 *
 * The backup calls carry the project the database belongs to, so the project
 * is part of every one of them.
 */
export function useDatabaseBackups({
  databaseId,
  projectId,
  getSdk,
  onBackups,
  notify,
}: UseDatabaseBackupsOptions) {
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [takingBackup, setTakingBackup] = useState(false);

  const handleRestore = useCallback(async (backupId: string) => {
    if (!projectId) return;
    setRestoringBackupId(backupId);
    notify('', 'success');
    try {
      await getSdk().databases.restore(projectId, databaseId, backupId);
      notify('Restore started', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Restore failed', 'error');
    } finally {
      setRestoringBackupId(null);
    }
  }, [databaseId, projectId, getSdk, notify]);

  const handleTakeBackup = useCallback(async () => {
    if (!projectId) return;
    setTakingBackup(true);
    notify('', 'success');
    try {
      const sdk = getSdk();
      await sdk.databases.backup(projectId, databaseId);
      const updated = (await sdk.databases.listBackups(projectId, databaseId)) as DatabaseBackup[];
      onBackups(updated);
      notify('Backup started', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Backup failed', 'error');
    } finally {
      setTakingBackup(false);
    }
  }, [databaseId, projectId, getSdk, onBackups, notify]);

  return { restoringBackupId, takingBackup, handleRestore, handleTakeBackup };
}
