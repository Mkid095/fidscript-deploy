'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { normalizeBackupRecord } from '@/lib/db-normalize';
import { useConfirm } from '@/components/ui/confirm-provider';
import type { BackupRecord } from '@/types';

interface StorageBucket { id: string; name: string; objectCount?: number; }

export function useBackups() {
  const { getSdk } = useAuth();
  const { databaseId, projectId } = useDatabase();
  const confirmFn = useConfirm();

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBackups = useCallback(async () => {
    if (!databaseId) return;
    setLoading(true);
    try {
      const raw = await getSdk().databases.listBackups(databaseId) as { backups: BackupRecord[] } | BackupRecord[];
      const bks = Array.isArray(raw) ? raw : raw.backups;
      setBackups(bks.map(b => normalizeBackupRecord(b as Parameters<typeof normalizeBackupRecord>[0])));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [databaseId, getSdk]);

  const loadBuckets = useCallback(async () => {
    if (!projectId) return;
    try {
      const bks = await getSdk().storage.listBuckets(projectId) as StorageBucket[];
      setBuckets(bks);
      if (bks.length > 0 && !bks.find(b => b.name === selectedBucket)) {
        setSelectedBucket(bks[0].name);
      }
    } catch { /* ignore */ }
  }, [projectId, getSdk, selectedBucket]);

  useEffect(() => {
    if (databaseId) { loadBackups(); loadBuckets(); }
  }, [databaseId, projectId, loadBackups, loadBuckets]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = useCallback(async () => {
    if (!databaseId) return;
    setCreating(true);
    try {
      const result = await getSdk().databases.backup(databaseId) as { backupId: string };
      showMsg('success', `Backup ${result.backupId} started.`);
      await loadBackups();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to start backup.');
    } finally { setCreating(false); }
  }, [databaseId, getSdk, loadBackups]);

  const handleRestore = useCallback(async (backupId: string) => {
    if (!databaseId) return;
    const ok = await confirmFn({
      title: 'Restore backup',
      message: 'This will overwrite all current data. Continue?',
      confirmLabel: 'Restore',
      variant: 'danger',
    });
    if (!ok) return;
    setRestoring(backupId);
    try {
      await getSdk().databases.restore(databaseId, backupId);
      showMsg('success', 'Database restored successfully.');
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Restore failed.');
    } finally { setRestoring(null); }
  }, [databaseId, getSdk, confirmFn]);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => showMsg('success', 'URL copied to clipboard.'))
      .catch(() => showMsg('error', 'Failed to copy URL to clipboard.'));
  }, []);

  return {
    backups, loading, creating, buckets, selectedBucket, restoring, message,
    loadBackups, loadBuckets, handleCreate, handleRestore, handleCopyUrl,
    setSelectedBucket, showMsg,
  };
}
