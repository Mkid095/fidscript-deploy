'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { formatBytes, formatRelativeTime, formatDuration } from '@/lib/format';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  HardDriveIcon, RefreshIcon, Upload01Icon, Download01Icon,
  Link01Icon, AlertCircleIcon, CheckmarkCircle03Icon,
  Clock02Icon, UserIcon, Archive01Icon,
} from '@hugeicons/core-free-icons';
import { normalizeBackupRecord } from '@/lib/db-normalize';
import type { BackupRecord } from '@/types';

interface StorageBucket { id: string; name: string; objectCount?: number; }

export function BackupsPanel() {
  const { getSdk } = useAuth();
  const { databaseId, projectId } = useDatabase();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('db-backups');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBackups = async () => {
    if (!databaseId) return;
    setLoading(true);
    try {
      // Real SDK returns { backups: BackupRecord[] }, unwrap to array
      const raw = await getSdk().databases.listBackups(databaseId) as { backups: BackupRecord[] } | BackupRecord[];
      const bks = Array.isArray(raw) ? raw : raw.backups;
      // Normalize: real API records lack versionLabel, type, scheduleId — derive defaults
      setBackups(bks.map(b => normalizeBackupRecord(b as Parameters<typeof normalizeBackupRecord>[0])));
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadBuckets = async () => {
    if (!projectId) return;
    try {
      const bks = await getSdk().storage.listBuckets(projectId) as StorageBucket[];
      setBuckets(bks);
      if (bks.length > 0 && !bks.find(b => b.name === selectedBucket)) {
        setSelectedBucket(bks[0].name);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (databaseId) { loadBackups(); loadBuckets(); }
  }, [databaseId, projectId]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async () => {
    if (!databaseId) return;
    setCreating(true);
    try {
      const result = await getSdk().databases.backup(databaseId) as { backupId: string };
      showMsg('success', `Backup ${result.backupId} started.`);
      await loadBackups();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to start backup.');
    } finally { setCreating(false); }
  };

  const handleRestore = async (backupId: string) => {
    if (!databaseId) return;
    if (!confirm('This will overwrite all current data. Continue?')) return;
    setRestoring(backupId);
    try {
      await getSdk().databases.restore(databaseId, backupId);
      showMsg('success', 'Database restored successfully.');
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Restore failed.');
    } finally { setRestoring(null); }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    showMsg('success', 'URL copied to clipboard.');
  };

  const statusColor: Record<string, string> = {
    completed:    'text-emerald-400',
    in_progress:  'text-yellow-400',
    failed:       'text-rose-400',
  };
  const statusBg: Record<string, string> = {
    completed:    'bg-emerald-500/10',
    in_progress:  'bg-yellow-500/10',
    failed:       'bg-rose-500/10',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={HardDriveIcon} size={18} className="text-[var(--text-dim)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Backups</h2>
        </div>
        <button onClick={loadBackups} disabled={loading} className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50">
          <HugeiconsIcon icon={RefreshIcon} size={12} />Refresh
        </button>
      </div>

      {/* Success/error banner */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded border text-xs ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
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
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text-dim)] font-mono">
              .sql.gz
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
            Exports all tables as a gzipped SQL archive. Stored in the selected bucket and retained for 30 days.
          </p>
        </div>
        {buckets.length > 0 && (
          <select
            value={selectedBucket}
            onChange={e => setSelectedBucket(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-[var(--accent)]/50"
          >
            {buckets.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleCreate}
          disabled={creating || buckets.length === 0}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-50 whitespace-nowrap"
        >
          <HugeiconsIcon icon={Upload01Icon} size={13} />
          {creating ? 'Creating…' : 'Create backup'}
        </button>
      </div>

      {buckets.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400">
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
          <table className="w-full text-xs">
            <thead className="bg-[var(--surface)]">
              <tr className="border-b border-[var(--rail)]">
                {['Status', 'Type', 'Version', 'Bucket', 'Size', 'Created', 'Duration', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map(bk => {
                const duration = bk.completedAt && bk.createdAt
                  ? new Date(bk.completedAt).getTime() - new Date(bk.createdAt).getTime()
                  : null;
                return (
                  <tr key={bk.id} className="border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20">
                    {/* Status */}
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBg[bk.status] ?? ''} ${statusColor[bk.status] ?? ''}`}>
                        {bk.status === 'in_progress' ? 'IN PROGRESS' : bk.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] ${
                        bk.type === 'scheduled' ? 'text-[var(--text-dim)]' : 'text-[var(--text-muted)]'
                      }`}>
                        <HugeiconsIcon
                          icon={bk.type === 'scheduled' ? Clock02Icon : UserIcon}
                          size={11}
                        />
                        {bk.type === 'scheduled' ? 'Scheduled' : 'Manual'}
                      </span>
                    </td>

                    {/* Version */}
                    <td className="px-4 py-2.5">
                      {bk.versionLabel ? (
                        <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--rail)]">
                          {bk.versionLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-dim)]">—</span>
                      )}
                    </td>

                    {/* Bucket */}
                    <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-dim)]">
                      <div className="flex items-center gap-1">
                        <HugeiconsIcon icon={Archive01Icon} size={10} className="text-[var(--text-dim)]" />
                        {bk.storageBucket ?? '—'}
                      </div>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--text-muted)]">
                      {bk.sizeBytes > 0 ? (
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Archive01Icon} size={10} className="text-[var(--text-dim)]" />
                          {formatBytes(bk.sizeBytes)}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-2.5 text-[var(--text-dim)]">
                      {formatRelativeTime(bk.createdAt)}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-2.5 text-[var(--text-dim)]">
                      {duration !== null ? formatDuration(duration) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {bk.url && (
                          <button
                            onClick={() => handleCopyUrl(bk.url!)}
                            title="Copy download URL"
                            className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]"
                          >
                            <HugeiconsIcon icon={Link01Icon} size={13} />
                          </button>
                        )}
                        {bk.status === 'completed' && (
                          <button
                            onClick={() => handleRestore(bk.id)}
                            disabled={restoring !== null}
                            title="Restore this backup"
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] disabled:opacity-40"
                          >
                            <HugeiconsIcon icon={Download01Icon} size={12} />
                            {restoring === bk.id ? 'Restoring…' : 'Restore'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
