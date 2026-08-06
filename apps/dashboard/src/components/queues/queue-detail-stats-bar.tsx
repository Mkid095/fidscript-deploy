'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Task01Icon, CheckmarkCircle01Icon, Cancel01Icon, Database01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import type { QueueStats } from './use-queues-realtime';

interface QueueDetailStatsBarProps {
  stats: QueueStats | null;
}

export function QueueDetailStatsBar({ stats }: QueueDetailStatsBarProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
        { label: 'Waiting',       value: stats.pending,      icon: Task01Icon,           iconColor: 'text-amber-400' },
        { label: 'Processing',    value: stats.delivered,    icon: Database01Icon,        iconColor: 'text-sky-400' },
        { label: 'Completed',     value: stats.acknowledged, icon: CheckmarkCircle01Icon, iconColor: 'text-emerald-400' },
        { label: 'Failed',        value: stats.failed,       icon: AlertCircleIcon,       iconColor: 'text-amber-400' },
        { label: 'Dead-Lettered', value: stats.deadLettered, icon: Cancel01Icon,          iconColor: 'text-rose-400' },
        { label: 'Stream Depth',  value: stats.jsDepth,      icon: Database01Icon,        iconColor: 'text-[var(--text-dim)]' },
      ].map(({ label, value, icon, iconColor }) => (
        <div key={label} className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HugeiconsIcon icon={icon} size={12} className={iconColor} />
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
