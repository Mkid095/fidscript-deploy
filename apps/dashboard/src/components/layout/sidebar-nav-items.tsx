'use client';

import type { Project } from '@/types';
import type { ProjectMode } from '@/app/(app)/projects/[projectId]/use-project-mode';
import { getFilteredNavGroups, getProjectRole } from './sidebar-hooks';
import { SidebarCollapsedNav } from './sidebar-collapsed-nav';
import { SidebarExpandedNav } from './sidebar-expanded-nav';

interface Props {
  project: Project;
  collapsed: boolean;
  mode: ProjectMode;
}

export function SidebarNavItems({ project, collapsed, mode }: Props) {
  const role = getProjectRole(project);
  const groups = getFilteredNavGroups(mode, role);
  const flatItems = groups.flatMap(g => g.items);

  if (collapsed) {
    return (
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        <SidebarCollapsedNav items={flatItems} projectId={project.id} role={role} />
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {groups.map(group => (
        <div key={group.label} className="mb-4 last:mb-0">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--text-dim)] uppercase mb-1 px-2">
            {group.label}
          </p>
          <SidebarExpandedNav items={group.items} projectId={project.id} role={role} />
        </div>
      ))}
    </nav>
  );
}
