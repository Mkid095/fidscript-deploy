'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon, Cancel01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import type { UserNotification } from '@fidscript-deploy/sdk';
import { NotificationItem } from './notification-item';

interface Props {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllRead,
  onClose,
}: Props) {
  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-xl z-50">
      <div className="px-4 py-3 border-b border-[var(--rail)] flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text)]">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-[var(--text-muted)] font-normal">
              {unreadCount} unread
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
            >
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={1.5} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors p-1"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="py-12 text-center">
            <HugeiconsIcon icon={Notification01Icon} size={24} strokeWidth={1.5} className="text-[var(--text-dim)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-dim)]">No notifications</p>
            <p className="text-xs text-[var(--text-dim)] mt-1">You're all caught up</p>
          </div>
        )}
        {!loading && notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
}
