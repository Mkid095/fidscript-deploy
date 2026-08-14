'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import type { UserNotification } from '@fidscript-deploy/sdk';
import { SEVERITY_COLORS, formatTime } from './notification-types';

interface Props {
  notification: UserNotification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({ notification: n, onMarkAsRead }: Props) {
  const isUnread = !n.readAt;
  return (
    <div
      // Note: if notifications ever contain clickable links, stop propagation on the link
      // so markAsRead only fires when clicking the notification background, not links
      onClick={() => isUnread && onMarkAsRead(n.id)}
      className={`px-4 py-3 border-b border-[var(--rail)]/50 hover:bg-[var(--rail)]/50 transition-colors cursor-pointer ${isUnread ? 'bg-[var(--accent)]/5' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_COLORS[n.severity] ?? SEVERITY_COLORS.info}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${isUnread ? 'text-[var(--text)] font-medium' : 'text-[var(--text-muted)]'}`}>
            {n.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed line-clamp-2">
            {n.message}
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-1">{formatTime(n.createdAt)}</p>
        </div>
        {isUnread && (
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
