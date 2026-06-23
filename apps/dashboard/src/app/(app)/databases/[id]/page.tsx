'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { Card, Button, Spinner, Toast } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface Database {
  id: string;
  name: string;
  type: 'postgres' | 'redis';
  status: string;
  connectionString?: string;
  ownerId: string;
  createdAt: string;
}

interface DatabaseBackup {
  id: string;
  databaseId: string;
  sizeBytes: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function maskConnectionString(connStr: string): string {
  return connStr.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

type Tab = 'overview' | 'backups' | 'connection' | 'versions' | 'settings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DatabaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { getSdk } = useAuth();

  const [db, setDb] = useState<Database | null>(null);
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [takingBackup, setTakingBackup] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [poolConnectionInfo, setPoolConnectionInfo] = useState<{ host: string; port: number; database: string; connectionString: string } | null>(null);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [id, getSdk]);

  const handleRotate = useCallback(async () => {
    setRotating(true);
    setToast(null);
    try {
      const sdk = getSdk();
      await sdk.databases.rotatePassword(id);
      const updated = await sdk.databases.get(id);
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
      if (poolOnly) {
        setPoolConnectionInfo(info);
      } else {
        setConnectionInfo(info);
      }
    } catch {
      // silently fail — connection tab will show unavailable
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !db) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/databases" className="hover:text-slate-300">Databases</Link>
          <span>&rsaquo;</span>
          <span className="text-red-400">{error ?? 'Not found'}</span>
        </div>
        <p className="text-red-400">{error ?? 'Database not found'}</p>
      </div>
    );
  }

  const maskedConnStr = db.connectionString ? maskConnectionString(db.connectionString) : '********';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/databases" className="hover:text-slate-300">Databases</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-200">{db.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">{db.name}</h1>
          <p className="text-sm text-slate-500">Type: {db.type} &middot; Status: {db.status}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e2130] mb-6">
        {(['overview', 'backups', 'connection', 'versions', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="border border-[#1e2130]" padding="lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Environment Variable</h2>
            <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800/30 rounded-lg px-4 py-3 text-sm">
              <span className="text-blue-400 mt-0.5 shrink-0">ℹ</span>
              <p className="text-slate-300">
                Use <code className="text-blue-300 font-mono bg-[#080a0d] px-1.5 py-0.5 rounded">DATABASE_URL</code>{' '}
                in your deployment env vars — the platform injects this automatically.
              </p>
            </div>
          </Card>

          <Card className="border border-[#1e2130]" padding="lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Connection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Connection string</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-slate-300 bg-[#080a0d] border border-[#1e2130] rounded px-3 py-2 font-mono truncate">
                    {showPassword && db.connectionString ? db.connectionString : maskedConnStr}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(s => !s)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyConnection}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={rotating}
                onClick={handleRotate}
              >
                Rotate Credentials
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div>
          {backups.length === 0 ? (
            <Card className="border border-[#1e2130]" padding="lg">
              <p className="text-sm text-slate-500 text-center">No backups available yet.</p>
            </Card>
          ) : (
            <Card className="border border-[#1e2130]" padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2130]">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">ID</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden md:table-cell">Size</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden lg:table-cell">Created</th>
                    <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(backup => (
                    <tr key={backup.id} className="border-b border-[#1e2130] last:border-0">
                      <td className="px-4 py-3 text-slate-200 font-mono text-xs">{backup.id}</td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                        {formatBytes(backup.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={restoringBackupId === backup.id}
                          onClick={() => handleRestore(backup.id)}
                        >
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Connection Tab */}
      {activeTab === 'connection' && (
        <div className="space-y-6">
          <Card className="border border-[#1e2130]" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">SSL Connection</h2>
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sslEnabled}
                  onChange={e => handleSslToggle(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                SSL
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Direct connection</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-slate-300 bg-[#080a0d] border border-[#1e2130] rounded px-3 py-2 font-mono truncate">
                    {connectionInfo ? connectionInfo.connectionString : 'Loading...'}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => connectionInfo && navigator.clipboard.writeText(connectionInfo.connectionString).then(() => setToast({ message: 'Copied', type: 'success' })).catch(() => setToast({ message: 'Failed to copy', type: 'error' }))}
                  >
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => loadConnectionInfo(false)}>
                    Load
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Pooled (PgBouncer)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-slate-300 bg-[#080a0d] border border-[#1e2130] rounded px-3 py-2 font-mono truncate">
                    {poolConnectionInfo ? poolConnectionInfo.connectionString : 'Click Load to fetch'}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => poolConnectionInfo && navigator.clipboard.writeText(poolConnectionInfo.connectionString).then(() => setToast({ message: 'Copied', type: 'success' })).catch(() => setToast({ message: 'Failed to copy', type: 'error' }))}
                  >
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => loadConnectionInfo(true)}>
                    Load
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Versions Tab — backup history as timeline */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex justify-end mb-2">
            <Button variant="secondary" size="sm" loading={takingBackup} onClick={handleTakeBackup}>
              Take backup now
            </Button>
          </div>
          {backups.length === 0 ? (
            <Card className="border border-[#1e2130]" padding="lg">
              <p className="text-sm text-slate-500 text-center">No versions available yet.</p>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-[#1e2130]" />
              {backups.map((backup, i) => (
                <div key={backup.id} className="relative flex gap-6 pb-6 last:pb-0">
                  <div className="relative z-10 flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-[#1e2130] bg-[#080a0d]">
                    <span className="text-xs text-slate-400">{i + 1}</span>
                  </div>
                  <Card className="flex-1 border border-[#1e2130]" padding="md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-200 font-medium">
                          Backup {formatBytes(backup.sizeBytes)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(backup.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={restoringBackupId === backup.id}
                        onClick={() => handleRestore(backup.id)}
                      >
                        Restore
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      ID: <span className="font-mono text-slate-400">{backup.id}</span>
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="border border-red-900/30" padding="lg">
            <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
            <p className="text-sm text-slate-400 mb-4">
              Permanently delete this database and all its data. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete Database
            </Button>
          </Card>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
