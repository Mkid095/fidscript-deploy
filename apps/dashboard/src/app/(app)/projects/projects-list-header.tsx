'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Search01Icon,
  Refresh01Icon,
  EyeIcon,
  EyeOffIcon,
  Rocket01Icon,
} from '@hugeicons/core-free-icons';
import { Button, Input, PageHeader, IconButton } from '@fidscript/ui';
import Link from 'next/link';

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
    <PageHeader
      title="Projects"
      description={
        <span aria-live="polite">
          {loading
            ? 'Loading…'
            : search
              ? `${filteredCount} of ${totalCount} project${totalCount !== 1 ? 's' : ''}`
              : `${totalCount} project${totalCount !== 1 ? 's' : ''}`}
          {!search && <span className="ml-2 text-[var(--text-dim)]">·</span>}
          {!search && (
            <span className="ml-2 text-[var(--text-dim)]">
              Deploy applications, databases, domains, and automation
            </span>
          )}
        </span>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto sm:flex-1 max-w-md">
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
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
        <IconButton label="Refresh" onClick={onRefresh} disabled={loading}>
          <HugeiconsIcon icon={Refresh01Icon} size={14} />
        </IconButton>
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
          <Link
            href="/deployments/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--rail)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--rail-light)] transition-colors"
          >
            <HugeiconsIcon icon={Rocket01Icon} size={14} />
            New deployment
          </Link>
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
      }
    />
  );
}