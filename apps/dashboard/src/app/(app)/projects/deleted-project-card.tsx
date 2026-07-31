// Deleted project card (trash section)

import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, ArchiveRestoreIcon } from '@hugeicons/core-free-icons';

import type { Project } from '@/types';
import { relativeTime } from './projects-utils';

interface DeletedProjectCardProps {
  project: Project;
  onRestore?: () => void;
  onPurge?: () => void;
}

export function DeletedProjectCard({ project, onRestore, onPurge }: DeletedProjectCardProps) {
  const deletedAt = project.deletedAt ? relativeTime(project.deletedAt) : null;

  return (
    <div className="group relative rounded-lg border border-red-900/30 bg-red-950/10 opacity-75">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] truncate">{project.name}</h3>
            <p className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">{project.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-red-900/30 text-[var(--danger)] border-[var(--danger)]/30/50">
            Deleted {deletedAt}
          </span>
        </div>
        {project.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 min-h-[2rem]">{project.description}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-red-900/30">
          <span className="text-xs px-2 py-0.5 rounded bg-red-950/50 text-[var(--text-muted)] border border-red-900/30 capitalize">
            {project.type}
          </span>
          <span className="text-xs text-[var(--text-dim)]">Permanently removed</span>
        </div>
      </div>
      {(onRestore || onPurge) && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {onRestore && (
            <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onRestore(); }}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--rail)] transition-colors"
              aria-label={`Restore ${project.name}`} title="Restore">
              <HugeiconsIcon icon={ArchiveRestoreIcon} size={14} />
            </button>
          )}
          {onPurge && (
            <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onPurge(); }}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--rail)] transition-colors"
              aria-label={`Permanently delete ${project.name}`} title="Delete permanently">
              <HugeiconsIcon icon={Delete01Icon} size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
