'use client';

import type { CronJobRun } from '@/types';
import { CheckmarkCircle02Icon, Cancel01Icon, AlertCircleIcon, AlarmClockIcon } from '@hugeicons/core-free-icons';

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${((ms % 60_000) / 1000).toFixed(0)}s`;
}

function statusColor(status: CronJobRun['status']): { dot: string } {
  switch (status) {
    case 'completed': return { dot: 'bg-[var(--success)]' };
    case 'failed':    return { dot: 'bg-[var(--danger)]' };
    case 'skipped':   return { dot: 'bg-[var(--warning)]' };
    default:          return { dot: 'bg-[var(--accent)]' };
  }
}

interface Props {
  runs: CronJobRun[];
}

export function RunTimeline({ runs }: Props) {
  const recent = [...runs].reverse().slice(-20);
  if (recent.length === 0) return null;
  const maxMs = Math.max(...recent.filter(r => r.durationMs != null).map(r => r.durationMs as number), 1);

  return (
    <div className="flex items-end gap-px h-10 mb-3">
      {recent.map((run) => {
        const { dot } = statusColor(run.status);
        const barH = run.durationMs != null
          ? Math.max(4, Math.round((run.durationMs / maxMs) * 36))
          : 6;
        return (
          <div
            key={run.id}
            title={`${run.status} · ${formatDuration(run.durationMs)} · ${new Date(run.startedAt).toLocaleString()}`}
            className={`flex-1 rounded-sm ${dot} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
            style={{ height: `${barH}px` }}
          />
        );
      })}
    </div>
  );
}
