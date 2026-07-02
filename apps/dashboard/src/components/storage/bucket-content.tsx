'use client';

import { Spinner } from '@fidscript/ui';
import { FileGrid } from './file-grid';
import { FileTable } from './file-table';
import { BucketEmptyState } from './bucket-empty-state';
import type { StorageFile } from '@/types';

type ViewMode = 'list' | 'grid';

interface BucketContentProps {
  files: StorageFile[];
  previewUrls: Record<string, string>;
  deletingId: string | null;
  loading: boolean;
  viewMode: ViewMode;
  prefix: string;
  onPreview: (file: StorageFile) => void;
  onCopyUrl: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string, fileName: string) => void;
  onUploadInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BucketContent({
  files,
  previewUrls,
  deletingId,
  loading,
  viewMode,
  prefix,
  onPreview,
  onCopyUrl,
  onDelete,
  onUploadInputChange,
}: BucketContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48 py-12">
        <Spinner size="md" />
      </div>
    );
  }

  if (files.length === 0) {
    return <BucketEmptyState prefix={prefix} onUploadInputChange={onUploadInputChange} />;
  }

  if (viewMode === 'grid') {
    return (
      <FileGrid
        files={files}
        previewUrls={previewUrls}
        deletingId={deletingId}
        onPreview={onPreview}
        onCopyUrl={onCopyUrl}
        onDelete={onDelete}
      />
    );
  }

  return (
    <FileTable
      files={files}
      deletingId={deletingId}
      onPreview={onPreview}
      onCopyUrl={onCopyUrl}
      onDelete={onDelete}
    />
  );
}
