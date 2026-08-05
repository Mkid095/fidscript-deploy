'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  FoldHorizontalIcon,
} from '@hugeicons/core-free-icons';

import type { Project } from '@/types';
import type { ProjectMode } from '@/app/(app)/projects/[projectId]/use-project-mode';
import { getNavGroups } from '@/app/(app)/projects/[projectId]/nav-groups';
import { SidebarCollapsedNav } from './sidebar-collapsed-nav';
import { SidebarExpandedNav } from './sidebar-expanded-nav';

// ─── Re-export NavItem so MobileTabBar can import it from here ───────────────
export type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

// ─── Section map (used by ProjectHeader for breadcrumbs) ───────────────────

export interface SectionInfo {
  group: string;
  label: string;
}

// Merged map: all possible sections (both deploy + baas modes)
export const SECTION_MAP: Record<string, SectionInfo> = {
  // Deploy mode
  services:    { group: 'Deploy',      label: 'Services'    },
  functions:   { group: 'Deploy',      label: 'Functions'   },
  deployments: { group: 'Deploy',      label: 'Deployments' },
  databases:   { group: 'Data',        label: 'Databases'   },
  storage:     { group: 'Data',        label: 'Storage'     },
  queues:      { group: 'Data',        label: 'Queues'      },
  scheduler:   { group: 'Automation',  label: 'Scheduler'  },
  email:       { group: 'Automation',  label: 'Email'      },
  domains:     { group: 'Automation',  label: 'Domains'   },
  realtime:    { group: 'Data',        label: 'Realtime'   },
  monitoring:  { group: 'Observe',     label: 'Monitoring' },
  logs:        { group: 'Observe',     label: 'Logs'       },
  settings:    { group: 'Settings',    label: 'Settings'   },
  // BaaS mode
  mcp:         { group: 'Platform',    label: 'API & MCP'  },
};

interface ProjectSidebarProps {
  project: Project;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mode: ProjectMode;
}

function StatusDot({ status }: { status?: string }) {
  const colorVar =
    status === 'ACTIVE' ? 'var(--success)' :
    status === 'SUSPENDED' ? 'var(--warning)' :
    status === 'CREATING' ? 'var(--info)' :
    'var(--text-dim)';
  return (
    <span
      className={`w-2 h-2 rounded-full ${status === 'CREATING' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: colorVar }}
    />
  );
}

export function ProjectSidebar({ project, collapsed, onCollapse, mode }: ProjectSidebarProps) {
  const role = (project.role ?? 'viewer').toLowerCase();

  return (
    <aside
      className="hidden md:flex flex-col bg-[var(--surface)] border-r border-[var(--rail)] flex-shrink-0 transition-all duration-300 ease-out overflow-hidden"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Header */}
      <div className="flex flex-col border-b border-[var(--rail)] flex-shrink-0">
        {/* Project name row */}
        <div
          className="flex items-center justify-between gap-2"
          style={{ padding: collapsed ? '0.75rem 0.625rem' : '0.875rem 1rem' }}
        >
          {collapsed ? (
            <div className="w-9 h-9 rounded-lg bg-[var(--rail)] flex items-center justify-center text-sm font-bold text-[var(--text)]">
              {project.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-sm font-bold text-[var(--accent)] flex-shrink-0">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{project.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusDot status={project.status} />
                  <span className="text-[10px] text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* All projects link (only when expanded) */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <Link
              href="/projects"
              className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-all"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="flex-shrink-0" />
              <span>All projects</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      {collapsed ? (
        <nav className="flex-1 overflow-y-auto py-2 px-1.5">
          <SidebarCollapsedNav
            items={getNavGroups(mode).flatMap(g => g.items)}
            projectId={project.id}
            role={role}
          />
        </nav>
      ) : (
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {getNavGroups(mode).map(group => {
            const visibleItems = group.items.filter(
              item => !item.adminOnly || ['owner', 'admin'].includes(role),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="text-[10px] font-semibold tracking-wider text-[var(--text-dim)] uppercase mb-1 px-2">
                  {group.label}
                </p>
                <SidebarExpandedNav items={visibleItems} projectId={project.id} role={role} />
              </div>
            );
          })}
        </nav>
      )}

      {/* Footer */}
      <div
        className="border-t border-[var(--rail)] flex-shrink-0"
        style={{ padding: collapsed ? '0.5rem' : '0.75rem 1rem' }}
      >
        {collapsed ? (
          <button
            onClick={() => onCollapse(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors"
            title="Expand sidebar"
          >
            <HugeiconsIcon icon={FoldHorizontalIcon} size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <StatusDot status={project.status} />
            <span className="text-xs text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
