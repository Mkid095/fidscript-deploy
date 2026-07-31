'use client';

import { useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useDatabaseDetail } from './use-database-detail';
import { DbOverviewCard } from './db-overview-card';
import { DbBackupsList } from './db-backups-list';
import { DbConnectionCard } from './db-connection-card';
import { DbVersionsList } from './db-versions-list';
import { DbSettings } from './db-settings';
import { DbToast } from './db-toast';

type Tab = 'overview' | 'backups' | 'connection' | 'versions' | 'settings';

interface PageProps { params: Promise<{ id: string }>; }

export default function DatabaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { getSdk } = useAuth();

  const {
    db, backups, loading, error, showPassword, setShowPassword,
    rotating, restoringBackupId, deleting, takingBackup,
    connectionInfo, poolConnectionInfo, sslEnabled, toast,
    handleRotate, handleRestore, handleDelete,
    handleCopyConnection, handleTakeBackup, loadConnectionInfo, handleSslToggle,
  } = useDatabaseDetail({ id, getSdk });

  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
          <Link href="/databases" className="hover:text-[var(--text-muted)]">Databases</Link>
          <span>&rsaquo;</span>
          <span className="text-[var(--danger)]">{error ?? 'Not found'}</span>
        </div>
        <p className="text-[var(--danger)]">{error ?? 'Database not found'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/databases" className="hover:text-[var(--text-muted)]">Databases</Link>
        <span>&rsaquo;</span>
        <span className="text-[var(--text)]">{db.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">{db.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">Type: {db.type} &middot; Status: {db.status}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--rail)] mb-6">
        {(['overview', 'backups', 'connection', 'versions', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-[var(--accent)] border-b-2 border-blue-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <DbOverviewCard
            db={db}
            showPassword={showPassword}
            rotating={rotating}
            onTogglePassword={() => setShowPassword(s => !s)}
            onCopy={handleCopyConnection}
            onRotate={handleRotate}
          />
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <DbBackupsList backups={backups} restoringBackupId={restoringBackupId} onRestore={handleRestore} />
      )}

      {/* Connection Tab */}
      {activeTab === 'connection' && (
        <div className="space-y-6">
          <DbConnectionCard
            connectionInfo={connectionInfo}
            poolConnectionInfo={poolConnectionInfo}
            sslEnabled={sslEnabled}
            onSslToggle={handleSslToggle}
            onLoadDirect={() => loadConnectionInfo(false)}
            onLoadPool={() => loadConnectionInfo(true)}
            onCopyDirect={() => { if (connectionInfo) navigator.clipboard.writeText(connectionInfo.connectionString).catch(() => {}); }}
            onCopyPool={() => { if (poolConnectionInfo) navigator.clipboard.writeText(poolConnectionInfo.connectionString).catch(() => {}); }}
          />
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <DbVersionsList
          backups={backups}
          restoringBackupId={restoringBackupId}
          takingBackup={takingBackup}
          onRestore={handleRestore}
          onTakeBackup={handleTakeBackup}
        />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <DbSettings deleting={deleting} onDelete={handleDelete} />
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded border text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
