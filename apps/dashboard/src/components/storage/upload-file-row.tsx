'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { fileIcon } from './file-utils';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  file: File;
  status: UploadStatus;
  error?: string;
}

interface UploadFileRowProps {
  item: UploadItem;
  onRemove: () => void;
}

export function UploadFileRow({ item, onRemove }: UploadFileRowProps) {
  const { file, status, error } = item;
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)]">
      <HugeiconsIcon
        icon={fileIcon(file.type)}
        size={16}
        className="text-[var(--text-dim)] flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text)] truncate">{file.name}</p>
        <p className="text-[10px] text-[var(--text-dim)]">
          {(file.size / 1024).toFixed(1)} KB
          {error && <span className="text-rose-400 ml-2">{error}</span>}
        </p>
      </div>
      <div className="flex-shrink-0">
        {status === 'pending' && (
          <button
            onClick={onRemove}
            aria-label="Remove upload"
            className="text-[var(--text-dim)] hover:text-rose-400 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        )}
        {status === 'uploading' && (
          <HugeiconsIcon icon={Upload01Icon} size={14} className="text-[var(--accent)] animate-pulse" />
        )}
        {status === 'done' && (
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-400" />
        )}
        {status === 'error' && (
          <HugeiconsIcon icon={Cancel01Icon} size={14} className="text-rose-400" />
        )}
      </div>
    </div>
  );
}
