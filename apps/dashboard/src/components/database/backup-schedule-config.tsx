'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Clock02Icon } from '@hugeicons/core-free-icons';
import type { BackupScheduleFrequency } from '@/types';

const FREQUENCY_OPTIONS: { value: BackupScheduleFrequency; label: string }[] = [
  { value: 'hourly',  label: 'Every hour' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface BackupScheduleConfigProps {
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  timeUtc: string;
  dayOfWeek: number;
  dayOfMonth: number;
  onFrequencyChange: (v: BackupScheduleFrequency) => void;
  onTimeChange: (v: string) => void;
  onDayOfWeekChange: (v: number) => void;
  onDayOfMonthChange: (v: number) => void;
}

export function BackupScheduleConfig({
  enabled, frequency, timeUtc, dayOfWeek, dayOfMonth,
  onFrequencyChange, onTimeChange, onDayOfWeekChange, onDayOfMonthChange,
}: BackupScheduleConfigProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Frequency */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Frequency</label>
        <select value={frequency} onChange={e => onFrequencyChange(e.target.value as BackupScheduleFrequency)} disabled={!enabled}
          className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40">
          {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Time */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Time (UTC)</label>
        <div className="relative">
          <HugeiconsIcon icon={Clock02Icon} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <input type="time" value={timeUtc} onChange={e => onTimeChange(e.target.value)} disabled={!enabled}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40" />
        </div>
      </div>

      {/* Day of week (weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Day of week</label>
          <select value={dayOfWeek} onChange={e => onDayOfWeekChange(Number(e.target.value))} disabled={!enabled}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40">
            {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      {/* Day of month (monthly) */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-1.5">Day of month</label>
          <select value={dayOfMonth} onChange={e => onDayOfMonthChange(Number(e.target.value))} disabled={!enabled}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 disabled:opacity-40">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
