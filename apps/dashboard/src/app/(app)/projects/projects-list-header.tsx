'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Search01Icon,
  Refresh01Icon,
  EyeIcon,
  EyeOffIcon,
} from '@hugeicons/core-free-icons';
import { Button, Input } from '@fidscript/ui';

export interface ProjectsListHeaderProps {
  userName?: string;
  search: string;
  loading: boolean;
  deletedCount: number;
  showDeleted: boolean;
  filteredCount: number;
  totalCount: number;
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleDeleted: () => void;
  onCreate: () => void;
}

export function ProjectsListHeader({
  userName,
  search,
  loading,
  deletedCount,
  showDeleted,
  filteredCount,
  totalCount,
  canCreate,
  onSearchChange,
  onRefresh,
  onToggleDeleted,
  onCreate,
}: ProjectsListHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">
          {userName ? `Welcome back, ${userName}` : 'Projects'}
        </h1>
        <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
          {loading
            ? 'Loading…'
            : search
              ? `${filteredCount} of ${totalCount} project${totalCount !== 1 ? 's' : ''}`
              : `${totalCount} project${totalCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
        <div className="relative flex-1 max-w-xs">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none"
          />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="pl-9 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh" aria-label="Refresh" disabled={loading}>
          <HugeiconsIcon icon={Refresh01Icon} size={14} />
        </Button>
        {deletedCount > 0 && (
          <Button
            variant={showDeleted ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleDeleted}
            title="Deleted projects"
            aria-label="Toggle deleted projects"
          >
            <HugeiconsIcon icon={showDeleted ? EyeOffIcon : EyeIcon} size={14} />
            <span className="ml-1 text-xs text-[var(--text-muted)]">{deletedCount}</span>
          </Button>
        )}
        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreate}
            className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--text)] hover:opacity-90"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} />
            New project
          </Button>
        )}
      </div>
    </div>
  );
}