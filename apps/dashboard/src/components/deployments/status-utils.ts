// Deployment status helpers and constants

export const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);
export const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED']);

export const STEPS = [
  { key: 'PENDING',   label: 'Pending',   phase: 1, color: 'bg-blue-500' },
  { key: 'QUEUED',    label: 'Queued',    phase: 1, color: 'bg-blue-500' },
  { key: 'BUILDING',  label: 'Building',  phase: 2, color: 'bg-amber-500' },
  { key: 'DEPLOYING', label: 'Deploying', phase: 3, color: 'bg-amber-500' },
  { key: 'SUCCESS',   label: 'Success',   phase: 4, color: 'bg-emerald-500' },
] as const;

export const TERMINAL_STEP_KEYS = ['FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED'] as const;

export function stepIndex(status?: string): number {
  return STEPS.findIndex(s => s.key === status?.toUpperCase()) ?? 0;
}

export function isInFlight(s?: string): boolean {
  return IN_FLIGHT_STATUSES.has(s?.toUpperCase() ?? '');
}

export function isTerminal(s?: string): boolean {
  return TERMINAL_STATUSES.has(s?.toUpperCase() ?? '');
}

export function statusMeta(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return { label: 'Live',         variant: 'success' as const };
    case 'FAILED':      return { label: 'Failed',       variant: 'danger' as const };
    case 'PENDING':     return { label: 'Pending',      variant: 'info' as const };
    case 'QUEUED':      return { label: 'Queued',       variant: 'info' as const };
    case 'BUILDING':    return { label: 'Building',     variant: 'warning' as const };
    case 'DEPLOYING':   return { label: 'Deploying',   variant: 'warning' as const };
    case 'STOPPED':     return { label: 'Stopped',     variant: 'default' as const };
    case 'ROLLED_BACK': return { label: 'Rolled back', variant: 'warning' as const };
    case 'BLOCKED':     return { label: 'Blocked',     variant: 'warning' as const };
    default:            return { label: status ?? 'Unknown', variant: 'default' as const };
  }
}

export function formatDuration(start: string, end?: string | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
