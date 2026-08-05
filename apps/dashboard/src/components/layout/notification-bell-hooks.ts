import { useState, useEffect, useRef, useCallback } from 'react';
import type { FidscriptSDK, UserNotification } from '@fidscript-deploy/sdk';

export function useNotificationBell(projectId: string, sdk: FidscriptSDK) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

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

  const handleMarkAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await sdk.notifications.markAsRead(id);
    } catch { /* best-effort */ }
  }, [sdk]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await sdk.notifications.markAllAsRead(projectId);
    } catch { /* best-effort */ }
  }, [sdk, projectId]);

  return {
    open, setOpen,
    notifications,
    unreadCount,
    loading,
    ref,
    handleMarkAsRead,
    handleMarkAllRead,
  };
}
