'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Button } from '@fidscript/ui';

type ViewMode = 'list' | 'grid';

interface BucketHeaderProps {
  projectId: string; bucketId: string; prefix: string;
  pathParts: string[]; filesCount: number; loading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewFolder: (prefix: string) => void;
  onOpenNewFolderModal: () => void;
  onUploadInputChange: () => void;
}

export function BucketHeader({
  projectId, bucketId, prefix, pathParts, filesCount, loading,
  viewMode,
  onViewModeChange, onNewFolder, onOpenNewFolderModal, onUploadInputChange,
}: BucketHeaderProps) {
  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] mb-2 flex-wrap">
        <Link href={`/projects/${projectId}/storage`} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
          <Icon icon="icons8:left-arrow" width={11} height={11} />
          Storage
        </Link>
        <Icon icon="icons8:chevron-right" width={10} height={10} />
        <button onClick={() => onNewFolder('')} className="hover:text-[var(--text)] transition-colors font-semibold text-[var(--text)]">
          {bucketId}
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <Icon icon="icons8:chevron-right" width={10} height={10} />
            <button onClick={() => onNewFolder(pathParts.slice(0, i + 1).join('/') + '/')} className="hover:text-[var(--text)] transition-colors">
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-0.5 truncate">
            {prefix ? prefix.replace(/\/$/, '') : bucketId}
          </h1>
          <p className="text-xs text-[var(--text-dim)]">
            {loading ? 'Loading…' : `${filesCount} object${filesCount !== 1 ? 's' : ''}${prefix ? ` in ${prefix}` : ''}`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center rounded-lg border border-[var(--rail)] overflow-hidden">
            <button onClick={() => onViewModeChange('list')} className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]'}`} title="List view">
              <Icon icon="icons8:list" width={13} height={13} />
            </button>
            <button onClick={() => onViewModeChange('grid')} className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]'}`} title="Grid view">
              <Icon icon="icons8:grid" width={13} height={13} />
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={onOpenNewFolderModal} className="text-[var(--text-dim)] hover:text-[var(--text)]">
            <Icon icon="icons8:folder" width={13} height={13} className="mr-1.5" />
            New Folder
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onUploadInputChange}
            className="bg-[var(--accent)] hover:bg-[var(--accent-dim)]"
          >
            <Icon icon="icons8:upload" width={13} height={13} className="mr-1.5" />
            Upload Files
          </Button>
        </div>
      </div>
    </>
  );
}
