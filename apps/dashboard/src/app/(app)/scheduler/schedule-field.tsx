'use client';

import { CronBuilder } from './cron-builder';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6am', value: '0 6 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly', value: '0 0 1 * *' },
];

interface ScheduleFieldProps {
  expression: string;
  timezone: string;
  onChange: (expression: string) => void;
}

export function ScheduleField({ expression, timezone, onChange }: ScheduleFieldProps) {
  return (
    <div>
      <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Schedule</label>
      <CronBuilder value={expression} timezone={timezone} onChange={onChange} />
      <div className="flex flex-wrap gap-1.5 mt-3">
        {CRON_PRESETS.map(p => (
          <button key={p.value} type="button" onClick={() => onChange(p.value)}
            className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
