'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Database, FidscriptSDK } from '@fidscript-deploy/sdk';
import { useConfirm } from '@/components/ui/confirm-provider';
import { useDatabaseBackups, type DatabaseBackup } from './use-database-backups';

interface UseDatabaseDetailOptions {
  id: string;
  getSdk: () => FidscriptSDK;
}

export function useDatabaseDetail({ id, getSdk }: UseDatabaseDetailOptions) {
  const confirmFn = useConfirm();
  const [db, setDb] = useState<Database | null>(null);
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [poolConnectionInfo, setPoolConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error') => {
    setToast(message ? { message, type } : null);
  }, []);

  const { restoringBackupId, takingBackup, handleRestore, handleTakeBackup } = useDatabaseBackups({
    databaseId: id,
    projectId: db?.projectId,
    getSdk,
    onBackups: setBackups,
    notify,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      // The backups live under the project the database belongs to, so the
      // database is read first and its project carries the rest.
      const dbData = await sdk.databases.get(id);
      setDb(dbData);
      const backupData = dbData.projectId
        ? await (sdk.databases.listBackups(dbData.projectId, id) as Promise<DatabaseBackup[]>)
        : [];
      setBackups(backupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [id, getSdk, db?.projectId]);

  useEffect(() => { load(); }, [load]);

  const handleRotate = useCallback(async () => {
    setRotating(true);
    setToast(null);
    try {
      const sdk = getSdk();
      if (!db?.projectId) return;
      const updated = await sdk.databases.rotatePassword<Database>(db.projectId, id);
      setDb(updated);
      setToast({ message: 'Credentials rotated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Rotate failed', type: 'error' });
    } finally {
      setRotating(false);
    }
  }, [id, getSdk, db?.projectId]);

  const handleDelete = useCallback(async () => {
    const ok = await confirmFn({
      title: 'Delete database',
      message: 'Are you sure you want to delete this database? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    setToast(null);
    try {
      const sdk = getSdk();
      if (!db?.projectId) return;
      await sdk.databases.delete(db.projectId, id);
      window.location.href = '/databases';
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed', type: 'error' });
      setDeleting(false);
    }
  }, [id, getSdk, db?.projectId]);

  const handleCopyConnection = useCallback(async () => {
    if (!db?.connectionString) return;
    try {
      await navigator.clipboard.writeText(db.connectionString);
      setToast({ message: 'Connection string copied', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy', type: 'error' });
    }
  }, [db?.connectionString]);

  const loadConnectionInfo = useCallback(async (poolOnly: boolean) => {
    try {
      const sdk = getSdk();
      if (!db?.projectId) return;
      const info = await sdk.databases.getConnection(db.projectId, id, poolOnly);
      if (poolOnly) setPoolConnectionInfo(info);
      else setConnectionInfo(info);
    } catch { /* silently fail */ }
  }, [id, getSdk, db?.projectId]);

  const handleSslToggle = useCallback(async (enabled: boolean) => {
    setSslEnabled(enabled);
    setToast(null);
    try {
      const sdk = getSdk();
      if (!db?.projectId) return;
      await sdk.databases.updateSsl(db.projectId, id, enabled);
      setToast({ message: `SSL ${enabled ? 'enabled' : 'disabled'}`, type: 'success' });
    } catch (err) {
      setSslEnabled(!enabled);
      setToast({ message: err instanceof Error ? err.message : 'Failed to update SSL', type: 'error' });
    }
  }, [id, getSdk, db?.projectId]);

  return {
    db, backups, loading, error, showPassword, setShowPassword,
    rotating, restoringBackupId, deleting, takingBackup,
    connectionInfo, poolConnectionInfo, sslEnabled, toast,
    handleRotate, handleRestore, handleDelete,
    handleCopyConnection, handleTakeBackup, loadConnectionInfo, handleSslToggle,
  };
}
