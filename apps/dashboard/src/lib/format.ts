/**
 * Formatting helpers — the single implementation of each.
 *
 * These existed as eight copies across the app, and they did not agree:
 * one relative-time copy said "5 min ago", another said "5m ago", and a
 * third said "Just now"; one byte formatter capped at MB, so a 2 GB file
 * was shown as "2048.0 MB". The same timestamp rendered three different
 * ways depending on which screen you were on.
 */
export function formatBytes(bytes: number | bigint | null | undefined): string {
  if (bytes == null) return '—';
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1_073_741_824) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b < 1_099_511_627_776) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  return `${(b / 1_099_511_627_776).toFixed(2)} TB`;
}

/** A duration in milliseconds. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * How long ago something happened.
 *
 * @param date an ISO string, a Date, or nothing at all
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (date == null || date === '') return '—';
  const t = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

/**
 * How long a deployment took, between two timestamps.
 *
 * Named for what it does rather than `formatDuration`, which is a
 * duration in milliseconds — the two used to share that name.
 */
export function formatTimeRange(start: string | Date, end?: string | Date | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
