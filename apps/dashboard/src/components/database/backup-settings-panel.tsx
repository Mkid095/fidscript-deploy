'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  HardDriveIcon, RefreshIcon, AlertCircleIcon,
  CheckmarkCircle03Icon, ToggleLeft, ToggleRight,
} from '@hugeicons/core-free-icons';
import { useBackupSettings } from './backup-settings-hooks';
import { BackupScheduleConfig } from './backup-schedule-config';
import { BackupRetentionConfig } from './backup-retention-config';

export function BackupSettingsPanel() {
  const {
    enabled, frequency, timeUtc, dayOfWeek, dayOfMonth, retentionCount,
    selectedBucket, buckets, saving, message, backupSchedule,
    setEnabled, setFrequency, setTimeUtc, setDayOfWeek, setDayOfMonth,
    setRetentionCount, setSelectedBucket,
    handleSave, refreshBackupSchedule,
  } = useBackupSettings();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={HardDriveIcon} size={18} className="text-[var(--text-dim)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">Backup Schedule</h2>
        </div>
        <button onClick={refreshBackupSchedule}
          className="flex items-center gap-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">
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
          <button onClick={() => setEnabled(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium ${enabled ? 'text-emerald-400' : 'text-[var(--text-dim)]'}`}>
            <HugeiconsIcon icon={enabled ? ToggleRight : ToggleLeft} size={20} />
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          <BackupScheduleConfig
            enabled={enabled} frequency={frequency} timeUtc={timeUtc}
            dayOfWeek={dayOfWeek} dayOfMonth={dayOfMonth}
            onFrequencyChange={setFrequency} onTimeChange={setTimeUtc}
            onDayOfWeekChange={setDayOfWeek} onDayOfMonthChange={setDayOfMonth}
          />

          <BackupRetentionConfig
            enabled={enabled} retentionCount={retentionCount}
            selectedBucket={selectedBucket} buckets={buckets}
            onRetentionChange={setRetentionCount} onBucketChange={setSelectedBucket}
          />

          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] text-[var(--text-dim)] space-y-0.5">
              {backupSchedule?.lastRunAt && (
                <p>Last run: <span className="text-[var(--text-muted)]">{new Date(backupSchedule.lastRunAt).toLocaleString()}</span></p>
              )}
              {backupSchedule?.nextRunAt && enabled && (
                <p>Next run: <span className="text-[var(--text-muted)]">{new Date(backupSchedule.nextRunAt).toLocaleString()} UTC</span></p>
              )}
            </div>
            <button onClick={handleSave} disabled={saving || buckets.length === 0}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--text)] font-medium disabled:opacity-40">
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
