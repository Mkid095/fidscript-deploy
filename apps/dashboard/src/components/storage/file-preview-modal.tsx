'use client';

import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AppleMusicIcon,
  Cancel01Icon,
  Delete02Icon,
  File02Icon,
  FileExportIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Spinner } from '@fidscript/ui';
import type { StorageFile } from '@/types';
import { formatBytes } from './file-utils';

interface FilePreviewModalProps {
  file: StorageFile | null;
  url: string | null;
  loading: boolean;
  onClose: () => void;
  onCopyUrl: (fileId: string, name: string, key?: string) => void;
  onDelete: (fileId: string, name: string) => void;
}

export function FilePreviewModal({
  file, url, loading, onClose, onCopyUrl, onDelete,
}: FilePreviewModalProps) {
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 lg:p-8"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--rail)] flex-shrink-0">
          <div className="min-w-0 mr-4">
            <h3 className="text-sm font-semibold text-[var(--text)] truncate">
              {file.originalName ?? file.key}
            </h3>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              {formatBytes(file.sizeBytes)} &middot; {file.mimeType ?? 'unknown type'}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onCopyUrl(file.id, file.originalName ?? file.key, file.key)}
              className="p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
              title="Copy URL"
            >
              <HugeiconsIcon icon={FileExportIcon} size={14} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-[var(--surface-2)]">
          {loading ? (
            <Spinner size="md" />
          ) : url ? (
            file.mimeType?.startsWith('image/') ? (
              <div className="relative w-full h-64 md:h-80 lg:h-96">
                <Image
                  src={url}
                  alt={file.originalName ?? file.key}
                  fill
                  className="object-contain rounded-lg"
                  sizes="(max-width: 768px) 100vw, 896px"
                />
              </div>
            ) : file.mimeType === 'application/pdf' ? (
              <iframe
                src={url}
                title={file.originalName ?? file.key}
                className="w-full h-[60vh] rounded-lg border border-[var(--rail)]"
              />
            ) : file.mimeType?.startsWith('video/') ? (
              <video src={url} controls className="max-w-full max-h-[60vh] rounded-lg">
                Your browser does not support video playback.
              </video>
            ) : file.mimeType?.startsWith('audio/') ? (
              <div className="text-center">
                <HugeiconsIcon icon={AppleMusicIcon} size={48} className="text-[var(--text-dim)] mx-auto mb-4" />
                <audio src={url} controls className="w-80 mx-auto block">
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : (
              <div className="text-center py-12">
                <HugeiconsIcon icon={File02Icon} size={48} className="text-[var(--text-dim)] mx-auto mb-3" />
                <p className="text-xs text-[var(--text-dim)]">Preview not available for this file type.</p>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <HugeiconsIcon icon={InformationCircleIcon} size={40} className="text-rose-400 mx-auto mb-3" />
              <p className="text-xs text-rose-400">Failed to load preview</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--rail)] flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] text-[var(--text-dim)] space-x-4">
            <span>Key: <span className="font-mono text-[9px]">{file.key}</span></span>
            <span>Uploaded: {new Date(file.createdAt).toLocaleString()}</span>
          </div>
          <button
            onClick={() => onDelete(file.id, file.originalName ?? file.key)}
            className="flex items-center gap-1.5 text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
          >
            <HugeiconsIcon icon={Delete02Icon} size={11} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
