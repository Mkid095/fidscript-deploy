'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  HardDriveIcon, RefreshIcon, Upload01Icon,
  AlertCircleIcon, CheckmarkCircle03Icon, Archive01Icon,
} from '@hugeicons/core-free-icons';
import { useBackups } from './backups-hooks';
import { BackupsTable } from './backups-table';

export function BackupsPanel() {
  const {
    backups, loading, creating, buckets, selectedBucket, restoring, message,
    loadBackups, handleCreate, handleRestore, handleCopyUrl, setSelectedBucket,
  } = useBackups();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={HardDriveIcon} size={18} className="text-[var(--text-dim)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Backups</h2>
        </div>
        <button onClick={loadBackups} disabled={loading}
          className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50">
          <HugeiconsIcon icon={RefreshIcon} size={12} />Refresh
        </button>
      </div>

      {/* Success/error banner */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
          message.type === 'success'
            ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
            : 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]'
        }`}>
          <HugeiconsIcon icon={message.type === 'success' ? CheckmarkCircle03Icon : AlertCircleIcon} size={14} />
          {message.text}
        </div>
      )}

      {/* Create backup card */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--rail)] bg-[var(--surface)]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-[var(--text)]">Create manual backup</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-dim)] font-mono">.sql.gz</span>
          </div>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
            Exports all tables as a gzipped SQL archive. Stored in the selected bucket and retained for 30 days.
          </p>
        </div>
        {buckets.length > 0 && (
          <select value={selectedBucket} onChange={e => setSelectedBucket(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[var(--accent)]/50">
            {buckets.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        )}
        <button onClick={handleCreate} disabled={creating || buckets.length === 0}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50 whitespace-nowrap">
          <HugeiconsIcon icon={Upload01Icon} size={13} />
          {creating ? 'Creating…' : 'Create backup'}
        </button>
      </div>

      {buckets.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/5 text-xs text-[var(--warning)]">
          <HugeiconsIcon icon={AlertCircleIcon} size={14} />
          No storage buckets found. Create a storage bucket first to enable backups.
        </div>
      )}

      {/* Backup history table */}
      <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)] flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text)]">Backup History</p>
          <span className="text-[10px] text-[var(--text-dim)]">{backups.length} total</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-dim)]">Loading backups…</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-dim)]">No backups yet.</div>
        ) : (
          <BackupsTable backups={backups} restoring={restoring} onRestore={handleRestore} onCopyUrl={handleCopyUrl} />
        )}
      </div>

      {/* Retention info */}
      <div className="flex items-start gap-2 rounded border border-[var(--rail)] p-4 text-[10px] text-[var(--text-dim)]">
        <HugeiconsIcon icon={AlertCircleIcon} size={12} className="flex-shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-[var(--text-muted)]">Retention:</span> Manual backups are kept up to 30 days (max 50).
          Scheduled backups are automatically pruned based on your retention policy.
          Restoring a backup will overwrite all current data.
        </span>
      </div>
    </div>
  );
}
