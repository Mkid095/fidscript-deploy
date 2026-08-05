'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { BackupSchedule } from '@/types';

interface DatabasesModuleExt {
  getBackupSchedule(databaseId: string): Promise<BackupSchedule | null>;
  updateBackupSchedule(databaseId: string, schedule: Partial<BackupSchedule>): Promise<BackupSchedule>;
}

export function useDatabaseBackup(databaseId: string | null) {
  const { getSdk } = useAuth();
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null);

  const refreshBackupSchedule = useCallback(async () => {
    if (!databaseId) return;
    try {
      const sdk = getSdk();
      const schedule = await (sdk.databases as unknown as DatabasesModuleExt).getBackupSchedule(databaseId) as BackupSchedule | null;
      setBackupSchedule(schedule);
    } catch { /* ignore */ }
  }, [databaseId, getSdk]);

  const updateBackupSchedule = useCallback(async (schedule: Partial<BackupSchedule> & { frequency: string }) => {
    if (!databaseId) return;
    const sdk = getSdk();
    const updated = await (sdk.databases as unknown as DatabasesModuleExt).updateBackupSchedule(databaseId, schedule) as BackupSchedule;
    setBackupSchedule(updated);
  }, [databaseId, getSdk]);

  return { backupSchedule, refreshBackupSchedule, updateBackupSchedule };
}
