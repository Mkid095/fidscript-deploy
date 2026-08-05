'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { FoldHorizontalIcon } from '@hugeicons/core-free-icons';
import type { Project } from '@/types';
import { getStatusColor } from './sidebar-hooks';

interface Props {
  project: Project;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export function SidebarFooter({ project, collapsed, onCollapse }: Props) {
  return (
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
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: getStatusColor(project.status) }}
          />
          <span className="text-xs text-[var(--text-dim)] capitalize">
            {project.status?.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
