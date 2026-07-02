'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '../../database-context';
import { ConnectionPanel } from '@/components/database/connection-panel';
import { MigrationsPanel } from '@/components/database/migrations-panel';
import { BackupSettingsPanel } from '@/components/database/backup-settings-panel';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Plug01Icon,
  GitMergeIcon,
  HardDriveIcon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';

type SettingsTab = 'connection' | 'migrations' | 'backups';

export default function SettingsPage() {
  const { getSdk } = useAuth();
  const { database, databaseId } = useDatabase();
  const [activeTab, setActiveTab] = useState<SettingsTab>('connection');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!databaseId) return;
    setDeleting(true);
    try {
      await getSdk().databases.delete(databaseId);
      window.location.href = `..`;
    } catch { /* ignore */ } finally { setDeleting(false); }
  }, [databaseId, getSdk]);

  const tabs: { key: SettingsTab; label: string; icon: typeof Plug01Icon }[] = [
    { key: 'connection', label: 'Connection',  icon: Plug01Icon },
    { key: 'migrations', label: 'Migrations', icon: GitMergeIcon },
    { key: 'backups',    label: 'Backups',    icon: HardDriveIcon },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b border-[var(--rail)] flex-shrink-0">
        <h1 className="text-lg font-semibold text-[var(--text)] font-mono">{database?.name ?? 'Database'}</h1>
        <p className="text-xs text-[var(--text-dim)] mt-0.5 mb-4">
          {database?.type} {database?.version} · {database?.environment}
        </p>

        {/* Tab bar */}
        <div className="flex items-center gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]'
              }`}
            >
              <HugeiconsIcon icon={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'connection' && <ConnectionPanel />}
        {activeTab === 'migrations' && <MigrationsPanel />}
        {activeTab === 'backups' && <BackupSettingsPanel />}
      </div>

      {/* Danger zone — always visible below */}
      <div className="px-6 pb-6 pt-4 border-t border-[var(--rail)] flex-shrink-0">
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
              <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-rose-400" />
              Delete this database
            </p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Permanently destroys the database and all data. Cannot be undone.</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs px-3 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 whitespace-nowrap"
          >
            Delete database
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Database"
          message={`Are you sure you want to delete "${database?.name}"? All data will be permanently destroyed. This action cannot be undone.`}
          confirmLabel="Delete permanently"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
