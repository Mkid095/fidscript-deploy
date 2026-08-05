'use client';

import { Icon } from '@iconify/react';
import type { QueueStats } from './use-queues-realtime';

interface QueueDetailStatsBarProps {
  stats: QueueStats | null;
}

export function QueueDetailStatsBar({ stats }: QueueDetailStatsBarProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Pending',      value: stats.pending,      icon: 'icons8:tasks',   iconColor: 'text-amber-400' },
        { label: 'Delivered',    value: stats.delivered,    icon: 'icons8:checked', iconColor: 'text-emerald-400' },
        { label: 'Dead-Lettered', value: stats.deadLettered, icon: 'icons8:cancel',  iconColor: 'text-rose-400' },
        { label: 'Stream Depth', value: stats.jsDepth,      icon: 'icons8:database', iconColor: 'text-[var(--text-dim)]' },
      ].map(({ label, value, icon, iconColor }) => (
        <div key={label} className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon icon={icon} width={12} height={12} className={iconColor} />
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{label}</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text)]">{value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
