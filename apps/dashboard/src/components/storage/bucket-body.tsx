'use client';

import { Icon } from '@iconify/react';
import { BucketHeader } from './bucket-header';
import { BucketContent } from './bucket-content';
import { FilePreviewModal } from './file-preview-modal';
import type { StorageFile } from '@/types';

type ViewMode = 'list' | 'grid';

interface BucketBodyProps {
  projectId: string; bucketId: string;
  files: StorageFile[]; previewUrls: Record<string, string>;
  loading: boolean; error: string | null;
  viewMode: ViewMode;
  prefix: string;
  dragging: boolean;
  previewFile: StorageFile | null; previewUrl: string | null; previewLoading: boolean;
  deletingId: string | null;
  dropRef: React.RefObject<HTMLDivElement | null>;
  onViewModeChange: (mode: ViewMode) => void;
  onNewFolder: (prefix: string) => void;
  onOpenNewFolderModal: () => void;
  onUploadInputChange: () => void;
  onPreview: (file: StorageFile) => void;
  onCopyUrl: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string, fileName: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onPreviewClose: () => void;
}

export function BucketBody({
  projectId, bucketId, files, previewUrls, loading, error,
  viewMode, prefix, dragging,
  previewFile, previewUrl, previewLoading, deletingId, dropRef,
  onViewModeChange, onNewFolder, onOpenNewFolderModal, onUploadInputChange,
  onPreview, onCopyUrl, onDelete, onDrop,
  onPreviewClose,
}: BucketBodyProps) {
  const pathParts = prefix ? prefix.split('/').filter(Boolean) : [];

  return (
    <div
      ref={dropRef}
      className="p-6 lg:p-8 space-y-6"
      onDragOver={e => { e.preventDefault(); }}
      onDragLeave={e => { if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {} }}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="fixed inset-0 z-50 bg-[var(--accent)]/10 border-2 border-dashed border-[var(--accent)] flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--surface)] rounded-2xl p-10 text-center border-2 border-dashed border-[var(--accent)] shadow-2xl">
            <Icon icon="icons8:upload" width={40} height={40} className="text-[var(--accent)] mx-auto mb-3" />
            <p className="text-[var(--text)] font-semibold text-sm">Drop files to upload</p>
          </div>
        </div>
      )}

      <BucketHeader
        projectId={projectId} bucketId={bucketId}
        prefix={prefix} pathParts={pathParts}
        filesCount={files.length} loading={loading}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onNewFolder={onNewFolder}
        onOpenNewFolderModal={onOpenNewFolderModal}
        onUploadInputChange={onUploadInputChange}
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded border text-xs bg-rose-500/10 border-rose-500/30 text-rose-400">
          {error}
        </div>
      )}

      <BucketContent
        files={files} previewUrls={previewUrls} deletingId={deletingId}
        loading={loading} viewMode={viewMode} prefix={prefix}
        onPreview={onPreview} onCopyUrl={onCopyUrl}
        onDelete={onDelete} onUploadInputChange={onUploadInputChange}
      />

      <FilePreviewModal
        file={previewFile} url={previewUrl} loading={previewLoading}
        onClose={onPreviewClose} onCopyUrl={onCopyUrl} onDelete={onDelete}
      />
    </div>
  );
}
