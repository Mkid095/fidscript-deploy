'use client';

import type { BackupScheduleFrequency } from '@/types';

interface StorageBucket { id: string; name: string; objectCount?: number; }

interface BackupRetentionConfigProps {
  enabled: boolean;
  retentionCount: number;
  selectedBucket: string;
  buckets: StorageBucket[];
  onRetentionChange: (v: number) => void;
  onBucketChange: (v: string) => void;
}

export function BackupRetentionConfig({
  enabled, retentionCount, selectedBucket, buckets,
  onRetentionChange, onBucketChange,
}: BackupRetentionConfigProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Retention */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Keep backups</label>
        <select value={retentionCount} onChange={e => onRetentionChange(Number(e.target.value))} disabled={!enabled}
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40">
          {[3, 7, 14, 30, 60, 90].map(n => (
            <option key={n} value={n}>{n} backup{n !== 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      {/* Storage bucket */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Storage bucket</label>
        <select value={selectedBucket} onChange={e => onBucketChange(e.target.value)} disabled={!enabled || buckets.length === 0}
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40">
          {buckets.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>
    </div>
  );
}
