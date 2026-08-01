// Shared utilities for the projects page

import type { Project } from '@/types';

// Must match the Prisma ProjectType enum exactly (API rejects anything else).
export type ProjectType = 'frontend' | 'backend' | 'worker' | 'cron' | 'docker' | 'static';
export const PROJECT_TYPES: ProjectType[] = ['frontend', 'backend', 'worker', 'cron', 'docker', 'static'];

// Universal status palette per ADR-036 principle 7.
// All colors come from theme CSS variables so light + dark keep legible contrast.
export const STATUS_PALETTE: Record<string, string> = {
  ACTIVE: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  HEALTHY: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
  RUNNING: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
  PENDING: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
  WARNING: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
  SUSPENDED: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
  FAILED: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30',
  STOPPED: 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]',
  CREATING: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30',
  ARCHIVED: 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30',
};

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Unicode NFC normalization — ensures "café" and "café" match the same way. */
export function normalize(str: string): string {
  return str.trim().toLowerCase().normalize('NFC');
}

export function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return new Date(iso).toLocaleDateString();
}

// API contract: PATCH requires admin/owner; DELETE requires owner only.
// Developer can see + navigate; cannot edit or delete.
// role is returned uppercase from auth.me() and lowercase from the projects list.
export function canEdit(userRole?: string, projectRole?: string): boolean {
  return (
    [userRole, projectRole].some(r => r?.toLowerCase() === 'owner') ||
    [userRole, projectRole].some(r => r?.toLowerCase() === 'admin')
  );
}

export function canDelete(userRole?: string, projectRole?: string): boolean {
  return [userRole, projectRole].some(r => r?.toLowerCase() === 'owner');
}
