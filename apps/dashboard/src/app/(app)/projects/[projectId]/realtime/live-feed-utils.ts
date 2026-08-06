/**
 * Pure helpers for the LiveFeed realtime panel.
 *
 * Holds the type contracts, category metadata, and small rendering helpers used
 * by both the data-fetching hook and the body component. No React, no SDK calls.
 */
import type { ComponentType } from 'react';
import {
  FlashIcon, Rocket01Icon, Database01Icon, SourceCodeIcon, Share08Icon,
  Clock01Icon, Mail01Icon, HardDriveIcon,
} from '@hugeicons/core-free-icons';

export type LiveFeedStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface LiveEvent {
  id: string;
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface LiveCategory {
  label: string;
  icon: typeof Rocket01Icon;
  cls: string; // tailwind classes for badge
  dot: string; // connection/row accent
}

// Event type prefix → category. The prefix is everything before the first dot.
export const LIVE_CATEGORIES: Record<string, LiveCategory> = {
  deployments: { label: 'Deploy', icon: Rocket01Icon, cls: 'text-blue-300 bg-blue-500/10 border-blue-500/25', dot: 'bg-blue-400' },
  database:    { label: 'Database', icon: Database01Icon, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
  realtime:    { label: 'Realtime', icon: FlashIcon, cls: 'text-violet-300 bg-violet-500/10 border-violet-500/25', dot: 'bg-violet-400' },
  functions:   { label: 'Function', icon: SourceCodeIcon, cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25', dot: 'bg-amber-400' },
  queues:      { label: 'Queue', icon: Share08Icon, cls: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25', dot: 'bg-cyan-400' },
  cron:        { label: 'Scheduler', icon: Clock01Icon, cls: 'text-pink-300 bg-pink-500/10 border-pink-500/25', dot: 'bg-pink-400' },
  email:       { label: 'Email', icon: Mail01Icon, cls: 'text-orange-300 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400' },
  storage:     { label: 'Storage', icon: HardDriveIcon, cls: 'text-teal-300 bg-teal-500/10 border-teal-500/25', dot: 'bg-teal-400' },
};

export const LIVE_FALLBACK_CATEGORY: LiveCategory = {
  label: 'Event',
  icon: FlashIcon,
  cls: 'text-slate-300 bg-slate-500/10 border-slate-500/25',
  dot: 'bg-slate-400',
};

export const MAX_LIVE_EVENTS = 250;

export function liveCategoryOf(type: string): { key: string; cat: LiveCategory } {
  const key = (type.split('.')[0] ?? '').toLowerCase();
  return { key, cat: LIVE_CATEGORIES[key] ?? LIVE_FALLBACK_CATEGORY };
}

export function summarizeLiveEvent(ev: LiveEvent): string {
  const d = ev.data ?? {};
  if (ev.type === 'database.row.changed') {
    const op = (d.operation as string) || 'CHANGE';
    const tbl = d.table ? `${d.schema ?? 'public'}.${d.table}` : '';
    return `${op} ${tbl}`.trim();
  }
  if (d.deploymentId) return `deployment ${String(d.deploymentId).slice(0, 8)}`;
  if (d.name) return String(d.name);
  return ev.type.split('.').slice(-1)[0] ?? ev.type;
}
