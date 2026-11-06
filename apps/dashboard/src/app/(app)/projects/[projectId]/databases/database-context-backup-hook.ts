'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { BackupSchedule } from '@/types';

interface DatabasesModuleExt {
  getBackupSchedule(projectId: string, databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(projectId: string, databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
}

export function useDatabaseBackup(projectId: string | null, databaseId: string | null) {
  const { getSdk } = useAuth();
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null);

  const refreshBackupSchedule = useCallback(async () => {
    if (!projectId || !databaseId) return;
    try {
      const sdk = getSdk();
      const schedule = await (sdk.databases as unknown as DatabasesModuleExt).getBackupSchedule(projectId, databaseId) as BackupSchedule | null;
      setBackupSchedule(schedule);
    } catch { /* ignore */ }
  }, [projectId, databaseId, getSdk]);

  const updateBackupSchedule = useCallback(async (schedule: Partial<BackupSchedule> & { frequency: string }) => {
    if (!projectId || !databaseId) return;
    const sdk = getSdk();
    const updated = await (sdk.databases as unknown as DatabasesModuleExt).updateBackupSchedule(projectId, databaseId, schedule) as BackupSchedule;
    setBackupSchedule(updated);
  }, [projectId, databaseId, getSdk]);

  return { backupSchedule, refreshBackupSchedule, updateBackupSchedule };
}
