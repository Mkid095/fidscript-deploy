// Deployment list section utilities — no React imports

import type { Deployment } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import {
  IN_FLIGHT_STATUSES,
  statusMeta,
  formatTimeRange,
  isInFlight,
} from '@/components/deployments/status-utils';

export { IN_FLIGHT_STATUSES, statusMeta, formatTimeRange, isInFlight };

// Aliases for existing consumers
export const getDeploymentStatus = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':     return { label: 'Live',         badge: 'bg-emerald-900/60 text-[var(--success)] border-[var(--success)]/30', dot: 'bg-[var(--success)]' };
    case 'FAILED':      return { label: 'Failed',       badge: 'bg-red-900/60 text-[var(--danger)] border-[var(--danger)]/30',           dot: 'bg-[var(--danger)]' };
    case 'PENDING':     return { label: 'Pending',       badge: 'bg-blue-900/60 text-[var(--accent)] border-blue-800',        dot: 'bg-[var(--accent)] animate-pulse' };
    case 'QUEUED':      return { label: 'Queued',        badge: 'bg-blue-900/60 text-[var(--accent)] border-blue-800',        dot: 'bg-[var(--accent)] animate-pulse' };
    case 'BUILDING':    return { label: 'Building',      badge: 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',     dot: 'bg-[var(--warning)] animate-pulse' };
    case 'DEPLOYING':   return { label: 'Deploying',     badge: 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30',     dot: 'bg-[var(--warning)] animate-pulse' };
    case 'STOPPED':     return { label: 'Stopped',       badge: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]',        dot: 'bg-slate-500' };
    case 'ROLLED_BACK': return { label: 'Rolled back',   badge: 'bg-purple-900/60 text-purple-400 border-purple-800', dot: 'bg-purple-500' };
    case 'BLOCKED':     return { label: 'Blocked',       badge: 'bg-orange-900/60 text-[var(--warning)] border-orange-800',  dot: 'bg-[var(--warning)]' };
    default:            return { label: status ?? 'Unknown', badge: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]', dot: 'bg-slate-600' };
  }
};

export const formatDeploymentDuration = formatTimeRange;
export const isDeploymentInFlight = isInFlight;

export type DeploymentTab = 'active' | 'all';

export function diffDuration(start: string, end?: string | null): number | null {
  if (!end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
}

export function applyDeploymentEvent(
  deployment: Deployment,
  eventType: string,
  data: Record<string, unknown>,
): Deployment {
  const statuses: Record<string, string> = {
    'deployments.deployment.succeeded': 'SUCCESS',
    'deployments.deployment.failed': 'FAILED',
    'deployments.deployment.stopped': 'STOPPED',
    'deployments.deployment.building': 'BUILDING',
    'deployments.deployment.queued': 'QUEUED',
    'deployments.deployment.deploying': 'DEPLOYING',
    'deployments.deployment.blocked': 'BLOCKED',
    'deployments.deployment.rolled_back': 'ROLLED_BACK',
  };
  const isCompleted = ['SUCCESS', 'FAILED', 'STOPPED'].includes(statuses[eventType] ?? '');
  return {
    ...deployment,
    status: statuses[eventType] ?? deployment.status,
    completedAt:
      typeof data.completedAt === 'string'
        ? data.completedAt
        : isCompleted
          ? new Date().toISOString()
          : deployment.completedAt,
    deploymentUrl:
      typeof data.deploymentUrl === 'string'
        ? data.deploymentUrl
        : deployment.deploymentUrl,
  };
}
