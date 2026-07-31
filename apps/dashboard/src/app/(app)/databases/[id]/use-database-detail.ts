'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Database } from '@fidscript-deploy/sdk';

interface DatabaseBackup {
  id: string;
  databaseId: string;
  sizeBytes: number;
  createdAt: string;
}

interface UseDatabaseDetailOptions {
  id: string;
  getSdk: () => ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>;
}

export function useDatabaseDetail({ id, getSdk }: UseDatabaseDetailOptions) {
  const [db, setDb] = useState<Database | null>(null);
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [takingBackup, setTakingBackup] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [poolConnectionInfo, setPoolConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [dbData, backupData] = await Promise.all([
        sdk.databases.get(id),
        sdk.databases.listBackups(id),
      ]);
      setDb(dbData);
      setBackups(backupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [id, getSdk]);

  useEffect(() => { load(); }, [load]);

  const handleRotate = useCallback(async () => {
    setRotating(true);
    setToast(null);
    try {
      const sdk = getSdk();
      const updated = await sdk.databases.rotatePassword(id);
      setDb(updated);
      setToast({ message: 'Credentials rotated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Rotate failed', type: 'error' });
    } finally {
      setRotating(false);
    }
  }, [id, getSdk]);

  const handleRestore = useCallback(async (backupId: string) => {
    setRestoringBackupId(backupId);
    setToast(null);
    try {
      const sdk = getSdk();
      await sdk.databases.restore(id, backupId);
      setToast({ message: 'Restore started', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Restore failed', type: 'error' });
    } finally {
      setRestoringBackupId(null);
    }
  }, [id, getSdk]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this database? This action cannot be undone.')) return;
    setDeleting(true);
    setToast(null);
    try {
      const sdk = getSdk();
      await sdk.databases.delete(id);
      window.location.href = '/databases';
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed', type: 'error' });
      setDeleting(false);
    }
  }, [id, getSdk]);

  const handleCopyConnection = useCallback(async () => {
    if (!db?.connectionString) return;
    try {
      await navigator.clipboard.writeText(db.connectionString);
      setToast({ message: 'Connection string copied', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy', type: 'error' });
    }
  }, [db?.connectionString]);

  const handleTakeBackup = useCallback(async () => {
    setTakingBackup(true);
    setToast(null);
    try {
      const sdk = getSdk();
      await sdk.databases.backup(id);
      const updated = await sdk.databases.listBackups(id);
      setBackups(updated);
      setToast({ message: 'Backup started', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Backup failed', type: 'error' });
    } finally {
      setTakingBackup(false);
    }
  }, [id, getSdk]);

  const loadConnectionInfo = useCallback(async (poolOnly: boolean) => {
    try {
      const sdk = getSdk();
      const info = await sdk.databases.getConnection(id, poolOnly);
      if (poolOnly) setPoolConnectionInfo(info);
      else setConnectionInfo(info);
    } catch { /* silently fail */ }
  }, [id, getSdk]);

  const handleSslToggle = useCallback(async (enabled: boolean) => {
    setSslEnabled(enabled);
    setToast(null);
    try {
      const sdk = getSdk();
      await sdk.databases.updateSsl(id, enabled);
      setToast({ message: `SSL ${enabled ? 'enabled' : 'disabled'}`, type: 'success' });
    } catch (err) {
      setSslEnabled(!enabled);
      setToast({ message: err instanceof Error ? err.message : 'Failed to update SSL', type: 'error' });
    }
  }, [id, getSdk]);

  return {
    db, backups, loading, error, showPassword, setShowPassword,
    rotating, restoringBackupId, deleting, takingBackup,
    connectionInfo, poolConnectionInfo, sslEnabled, toast,
    handleRotate, handleRestore, handleDelete,
    handleCopyConnection, handleTakeBackup, loadConnectionInfo, handleSslToggle,
  };
}
