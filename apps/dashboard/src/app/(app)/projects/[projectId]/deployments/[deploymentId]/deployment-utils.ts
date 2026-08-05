export function extractLogs(logData: unknown): string {
  if (typeof logData === 'string') return logData;
  if (logData && typeof logData === 'object' && 'logs' in logData) {
    const logs = (logData as { logs: unknown }).logs;
    if (typeof logs === 'string') return logs;
  }
  return JSON.stringify(logData);
}

export function formatDuration(start: string, end?: string | null): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, e - s);
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}