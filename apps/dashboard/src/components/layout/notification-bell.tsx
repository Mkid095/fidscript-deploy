'use client';

import { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon, Cancel01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import type { FidscriptSDK, UserNotification } from '@fidscript/sdk';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-[var(--danger)]',
  warning: 'bg-[var(--warning)]',
  info: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
};

interface NotificationBellProps {
  projectId: string;
  sdk: FidscriptSDK;
}

export function NotificationBell({ projectId, sdk }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Poll for unread count every 30s
  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      try {
        const { count } = await sdk.notifications.getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch { /* best-effort */ }
    }
    loadCount();
    const interval = setInterval(loadCount, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sdk]);

  // Load notifications when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await sdk.notifications.list({ projectId, limit: 20 });
        if (!cancelled) setNotifications(data.notifications ?? []);
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, projectId, sdk]);

  async function handleMarkAsRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await sdk.notifications.markAsRead(id);
    } catch { /* best-effort */ }
  }

  async function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await sdk.notifications.markAllAsRead(projectId);
    } catch { /* best-effort */ }
  }

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
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg shadow-xl z-50">
          {/* Header */}
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
                  onClick={handleMarkAllRead}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={1.5} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors p-1"
                aria-label="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* List */}
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
            {!loading && notifications.map(n => {
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && handleMarkAsRead(n.id)}
                  className={`px-4 py-3 border-b border-[var(--rail)]/50 hover:bg-[var(--rail)]/50 transition-colors cursor-pointer ${isUnread ? 'bg-[var(--accent)]/5' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Severity dot */}
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
