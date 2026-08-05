'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import type { Project } from '@/types';
import type { ProjectMode } from '@/app/(app)/projects/[projectId]/use-project-mode';
import { SidebarNavItems } from './sidebar-nav-items';
import { SidebarFooter } from './sidebar-footer';
import { getStatusColor, isCreating } from './sidebar-hooks';

// ─── Re-export NavItem so MobileTabBar can import it from here ───────────────
export type { NavItem } from '@/app/(app)/projects/[projectId]/nav-groups';

// ─── Section map (used by ProjectHeader for breadcrumbs) ───────────────────

export interface SectionInfo {
  group: string;
  label: string;
}

export const SECTION_MAP: Record<string, SectionInfo> = {
  services:    { group: 'Deploy',     label: 'Services'    },
  functions:   { group: 'Deploy',     label: 'Functions'   },
  deployments: { group: 'Deploy',     label: 'Deployments' },
  databases:   { group: 'Data',       label: 'Databases'   },
  storage:     { group: 'Data',       label: 'Storage'     },
  queues:      { group: 'Data',       label: 'Queues'      },
  scheduler:   { group: 'Automation', label: 'Scheduler'  },
  email:       { group: 'Automation', label: 'Email'      },
  domains:     { group: 'Automation', label: 'Domains'   },
  realtime:    { group: 'Data',       label: 'Realtime'   },
  monitoring:  { group: 'Observe',    label: 'Monitoring' },
  logs:        { group: 'Observe',    label: 'Logs'       },
  settings:    { group: 'Settings',   label: 'Settings'   },
  mcp:         { group: 'Platform',  label: 'API & MCP'  },
};

interface ProjectSidebarProps {
  project: Project;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mode: ProjectMode;
}

function StatusDot({ status }: { status?: string }) {
  return (
    <span
      className={`w-2 h-2 rounded-full ${isCreating(status) ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: getStatusColor(status) }}
    />
  );
}

function ProjectAvatar({ project, collapsed }: { project: Project; collapsed: boolean }) {
  const initial = project.name.charAt(0).toUpperCase();
  if (collapsed) {
    return (
      <div className="w-9 h-9 rounded-lg bg-[var(--rail)] flex items-center justify-center text-sm font-bold text-[var(--text)]">
        {initial}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-sm font-bold text-[var(--accent)] flex-shrink-0">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text)] truncate">{project.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusDot status={project.status} />
          <span className="text-[10px] text-[var(--text-dim)] capitalize">{project.status?.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectSidebar({ project, collapsed, onCollapse, mode }: ProjectSidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col bg-[var(--surface)] border-r border-[var(--rail)] flex-shrink-0 transition-all duration-300 ease-out overflow-hidden"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Header */}
      <div className="flex flex-col border-b border-[var(--rail)] flex-shrink-0">
        <div
          className="flex items-center justify-between gap-2"
          style={{ padding: collapsed ? '0.75rem 0.625rem' : '0.875rem 1rem' }}
        >
          <ProjectAvatar project={project} collapsed={collapsed} />
        </div>

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
      <SidebarNavItems project={project} collapsed={collapsed} mode={mode} />

      {/* Footer */}
      <SidebarFooter project={project} collapsed={collapsed} onCollapse={onCollapse} />
    </aside>
  );
}
