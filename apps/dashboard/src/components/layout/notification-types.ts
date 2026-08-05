import type { UserNotification } from '@fidscript-deploy/sdk';

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-[var(--danger)]',
  warning: 'bg-[var(--warning)]',
  info: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
};

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export interface NotificationBellProps {
  projectId: string;
  sdk: import('@fidscript-deploy/sdk').FidscriptSDK;
}

export function isUnread(n: UserNotification): boolean {
  return !n.readAt;
}
