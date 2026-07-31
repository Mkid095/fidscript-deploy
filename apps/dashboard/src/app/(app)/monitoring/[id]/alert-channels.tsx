'use client';

import type { AlertRule, NotificationChannel } from '@/types';

interface AlertChannelsProps {
  channels: AlertRule['channels'];
  allChannels: NotificationChannel[];
}

export function AlertChannels({ channels, allChannels }: AlertChannelsProps) {
  if (channels.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Notification Channels</h2>
      <div className="flex flex-wrap gap-2">
        {channels.map(cid => {
          const ch = allChannels.find(c => c.id === cid);
          return (
            <span
              key={cid}
              className="text-xs px-2 py-1 rounded bg-[var(--rail)] text-[var(--text-muted)] border border-[var(--rail)]"
            >
              {ch ? `${ch.name} (${ch.type})` : cid}
            </span>
          );
        })}
      </div>
    </div>
  );
}
