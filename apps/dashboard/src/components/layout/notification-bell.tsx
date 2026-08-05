'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { NotificationDropdown } from './notification-dropdown';
import { useNotificationBell } from './notification-bell-hooks';

interface NotificationBellProps {
  projectId: string;
  sdk: FidscriptSDK;
}

export function NotificationBell({ projectId, sdk }: NotificationBellProps) {
  const {
    open, setOpen,
    notifications,
    unreadCount,
    loading,
    ref,
    handleMarkAsRead,
    handleMarkAllRead,
  } = useNotificationBell(projectId, sdk);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--rail)] transition-colors"
        aria-label="Notifications"
      >
        <HugeiconsIcon icon={Notification01Icon} size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[var(--danger)] rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>
      {open && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
