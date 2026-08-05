'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import type { BackupScheduleFrequency } from '@/types';

interface StorageBucket { id: string; name: string; objectCount?: number; }

export function useBackupSettings() {
  const { getSdk } = useAuth();
  const { databaseId, projectId, backupSchedule, refreshBackupSchedule, updateBackupSchedule } = useDatabase();

  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<BackupScheduleFrequency>('daily');
  const [timeUtc, setTimeUtc] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [retentionCount, setRetentionCount] = useState(7);
  const [selectedBucket, setSelectedBucket] = useState('db-backups');
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync local state from backupSchedule
  useEffect(() => {
    if (backupSchedule) {
      setEnabled(backupSchedule.enabled);
      setFrequency(backupSchedule.frequency);
      setTimeUtc(backupSchedule.timeUtc);
      setDayOfWeek(backupSchedule.dayOfWeek ?? 0);
      setDayOfMonth(backupSchedule.dayOfMonth ?? 1);
      setRetentionCount(backupSchedule.retentionCount);
      setSelectedBucket(backupSchedule.storageBucket || 'db-backups');
    }
  }, [backupSchedule]);

  // Load storage buckets
  useEffect(() => {
    if (!projectId) return;
    getSdk().storage.listBuckets(projectId).then((bks: unknown) => {
      const arr = bks as StorageBucket[];
      setBuckets(arr);
      if (arr.length > 0 && !arr.find(b => b.name === selectedBucket)) {
        setSelectedBucket(arr[0].name);
      }
    }).catch(() => {});
  }, [projectId, getSdk, selectedBucket]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = useCallback(async () => {
    if (!databaseId) return;
    setSaving(true);
    try {
      await updateBackupSchedule({
        id: backupSchedule?.id,
        enabled,
        frequency,
        timeUtc,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        retentionCount,
        storageBucket: selectedBucket,
      });
      showMsg('success', 'Backup schedule saved.');
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  }, [databaseId, backupSchedule, enabled, frequency, timeUtc, dayOfWeek, dayOfMonth, retentionCount, selectedBucket, updateBackupSchedule]);

  return {
    enabled, frequency, timeUtc, dayOfWeek, dayOfMonth, retentionCount,
    selectedBucket, buckets, saving, message, backupSchedule,
    setEnabled, setFrequency, setTimeUtc, setDayOfWeek, setDayOfMonth,
    setRetentionCount, setSelectedBucket,
    handleSave, refreshBackupSchedule, showMsg,
  };
}
