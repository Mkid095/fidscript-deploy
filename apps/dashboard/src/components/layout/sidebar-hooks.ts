import type { Project } from '@/types';
import type { ProjectMode } from '@/app/(app)/projects/[projectId]/use-project-mode';
import { getNavGroups } from '@/app/(app)/projects/[projectId]/nav-groups';
import type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

/* ─── StatusDot (presentational, derived from project state) ───────────────── */

export function getStatusColor(status?: string): string {
  switch (status) {
    case 'ACTIVE':    return 'var(--success)';
    case 'SUSPENDED': return 'var(--warning)';
    case 'CREATING':  return 'var(--info)';
    default:          return 'var(--text-dim)';
  }
}

export function isCreating(status?: string): boolean {
  return status === 'CREATING';
}

/* ─── Role helper ─────────────────────────────────────────────────────────── */

export function getProjectRole(project: Project): string {
  return (project.role ?? 'viewer').toLowerCase();
}

/* ─── Nav helpers ─────────────────────────────────────────────────────────── */

export function getFilteredNavGroups(mode: ProjectMode, role: string): { label: string; items: NavItem[] }[] {
  return getNavGroups(mode)
    .map(group => ({
      ...group,
      items: group.items.filter(
        item => !item.adminOnly || ['owner', 'admin'].includes(role),
      ),
    }))
    .filter(group => group.items.length > 0);
}
