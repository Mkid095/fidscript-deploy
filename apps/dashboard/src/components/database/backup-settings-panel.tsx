'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  HardDriveIcon, RefreshIcon, AlertCircleIcon,
  CheckmarkCircle03Icon, ToggleLeft, ToggleRight,
  Clock02Icon,
} from '@hugeicons/core-free-icons';
import type { BackupScheduleFrequency } from '@/types';

interface StorageBucket { id: string; name: string; objectCount?: number; }

const FREQUENCY_OPTIONS: { value: BackupScheduleFrequency; label: string }[] = [
  { value: 'hourly',  label: 'Every hour' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BackupSettingsPanel() {
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

  const handleSave = async () => {
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
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={HardDriveIcon} size={18} className="text-[var(--text-dim)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Backup Schedule</h2>
        </div>
        <button
          onClick={refreshBackupSchedule}
          className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]"
        >
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

      {/* No buckets warning */}
      {buckets.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400">
          <HugeiconsIcon icon={AlertCircleIcon} size={14} />
          No storage buckets found. Create a storage bucket first to enable scheduled backups.
        </div>
      )}

      {/* Schedule form */}
      <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--rail)] flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text)]">Auto-backup</p>
          <button
            onClick={() => setEnabled(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              enabled ? 'text-emerald-400' : 'text-[var(--text-dim)]'
            }`}
          >
            <HugeiconsIcon icon={enabled ? ToggleRight : ToggleLeft} size={20} />
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as BackupScheduleFrequency)}
                disabled={!enabled}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
              >
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Time (UTC)
              </label>
              <div className="relative">
                <HugeiconsIcon icon={Clock02Icon} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input
                  type="time"
                  value={timeUtc}
                  onChange={e => setTimeUtc(e.target.value)}
                  disabled={!enabled}
                  className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Day of week (weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Day of week
              </label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(Number(e.target.value))}
                disabled={!enabled}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
              >
                {DAY_LABELS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of month (monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Day of month
              </label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value))}
                disabled={!enabled}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Retention + bucket row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Keep backups
              </label>
              <select
                value={retentionCount}
                onChange={e => setRetentionCount(Number(e.target.value))}
                disabled={!enabled}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
              >
                {[3, 7, 14, 30, 60, 90].map(n => (
                  <option key={n} value={n}>{n} backup{n !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">
                Storage bucket
              </label>
              <select
                value={selectedBucket}
                onChange={e => setSelectedBucket(e.target.value)}
                disabled={!enabled || buckets.length === 0}
                className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40"
              >
                {buckets.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {/* Last run / next run info */}
            <div className="text-[10px] text-[var(--text-dim)] space-y-0.5">
              {backupSchedule?.lastRunAt && (
                <p>Last run: <span className="text-[var(--text-muted)]">{new Date(backupSchedule.lastRunAt).toLocaleString()}</span></p>
              )}
              {backupSchedule?.nextRunAt && enabled && (
                <p>Next run: <span className="text-[var(--text-muted)]">{new Date(backupSchedule.nextRunAt).toLocaleString()} UTC</span></p>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || buckets.length === 0}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Retention info */}
      <div className="flex items-start gap-2 rounded border border-[var(--rail)] p-4 text-[10px] text-[var(--text-dim)]">
        <HugeiconsIcon icon={AlertCircleIcon} size={12} className="flex-shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-[var(--text-muted)]">About auto-backup:</span>{' '}
          Backups are saved as <span className="font-mono text-[var(--text-muted)]">.sql.gz</span> archives.
          Scheduled backups are versioned automatically. Restoring a backup will overwrite all current data.
          Old backups beyond the retention count are pruned automatically.
        </span>
      </div>
    </div>
  );
}
