// Shared utilities for services pages

import type { Deployment } from '@/types';

export const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);
export const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'STOPPED', 'ROLLED_BACK', 'BLOCKED']);

export function statusMeta(status?: string) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return { label: 'Live',        variant: 'success' as const, dot: 'bg-emerald-400' };
    case 'FAILED':      return { label: 'Failed',      variant: 'danger' as const, dot: 'bg-red-500' };
    case 'PENDING':     return { label: 'Pending',     variant: 'info' as const, dot: 'bg-blue-400 animate-pulse' };
    case 'QUEUED':      return { label: 'Queued',      variant: 'info' as const, dot: 'bg-blue-400 animate-pulse' };
    case 'BUILDING':    return { label: 'Building',    variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' };
    case 'DEPLOYING':   return { label: 'Deploying',   variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' };
    case 'STOPPED':     return { label: 'Stopped',     variant: 'default' as const, dot: 'bg-slate-500' };
    case 'ROLLED_BACK': return { label: 'Rolled back', variant: 'warning' as const, dot: 'bg-purple-500' };
    case 'BLOCKED':     return { label: 'Blocked',     variant: 'warning' as const, dot: 'bg-orange-400' };
    default:            return { label: status ?? 'Unknown', variant: 'default' as const, dot: 'bg-slate-600' };
  }
}

export function isInFlight(s?: string) { return IN_FLIGHT_STATUSES.has(s?.toUpperCase() ?? ''); }
export function isTerminal(s?: string) { return TERMINAL_STATUSES.has(s?.toUpperCase() ?? ''); }

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

export function formatDuration(start: string, end?: string | null): string {
  if (!end) return 'In progress';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function extractRepoKey(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+\/[^/]+)/) || url.match(/^([^/]+\/[^/]+\.git)$/);
  return m ? m[1].replace(/\.git$/, '') : null;
}

export interface ServiceGroup {
  name: string;
  deployments: Deployment[];
}
