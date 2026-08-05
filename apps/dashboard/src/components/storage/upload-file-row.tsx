'use client';

import { Icon } from '@iconify/react';
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
      <Icon
        icon={fileIcon(file.type)}
        width={16}
        height={16}
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
            className="text-[var(--text-dim)] hover:text-rose-400 transition-colors"
          >
            <Icon icon="icons8:cancel" width={14} height={14} />
          </button>
        )}
        {status === 'uploading' && (
          <Icon icon="icons8:upload" width={14} height={14} className="text-[var(--accent)] animate-pulse" />
        )}
        {status === 'done' && (
          <Icon icon="icons8:checkmark" width={14} height={14} className="text-emerald-400" />
        )}
        {status === 'error' && (
          <Icon icon="icons8:cancel" width={14} height={14} className="text-rose-400" />
        )}
      </div>
    </div>
  );
}
