'use client';

import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  FileExportIcon,
  Image01Icon,
} from '@hugeicons/core-free-icons';
import { Card } from '@fidscript/ui';
import type { StorageFile } from '@/types';
import { formatBytes, getFileTypeInfo, isPreviewable } from './file-utils';

interface FileGridProps {
  files: StorageFile[];
  previewUrls: Record<string, string>;
  deletingId: string | null;
  onPreview: (file: StorageFile) => void;
  onCopyUrl: (fileId: string, name: string, key?: string) => void;
  onDelete: (fileId: string, name: string) => void;
}

export function FileGrid({
  files, previewUrls, deletingId, onPreview, onCopyUrl, onDelete,
}: FileGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {files.map(file => {
        const typeInfo = getFileTypeInfo(file.mimeType);
        const previewable = isPreviewable(file.mimeType);
        const previewUrl = previewUrls[file.id];

        return (
          <div key={file.id} className="group relative">
            <button
              onClick={() => previewable ? onPreview(file) : null}
              className="w-full text-left"
            >
              <Card
                className={`border border-[var(--rail)] hover:border-[var(--accent)]/50 transition-all duration-150 overflow-hidden ${previewable ? 'cursor-pointer' : 'cursor-default'}`}
                padding="none"
              >
                {/* Preview area */}
                <div className="aspect-square bg-[var(--surface-2)] flex items-center justify-center relative">
                  {previewUrl && file.mimeType?.startsWith('image/') ? (
                    <Image
                      src={previewUrl}
                      alt={file.originalName ?? file.key}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  ) : (
                    <HugeiconsIcon icon={typeInfo.Icon} size={28} className={typeInfo.color} />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {previewable && <HugeiconsIcon icon={Image01Icon} size={20} className="text-white" />}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-medium text-[var(--text)] truncate" title={file.originalName ?? file.key}>
                    {file.originalName ?? file.key}
                  </p>
                  <p className="text-[9px] text-[var(--text-dim)] mt-0.5">{formatBytes(file.sizeBytes)}</p>
                </div>
              </Card>
            </button>

            {/* Action buttons on hover */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {previewable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPreview(file); }}
                  className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  title="Preview"
                >
                  <HugeiconsIcon icon={Image01Icon} size={11} className="text-white" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onCopyUrl(file.id, file.originalName ?? file.key, file.key); }}
                className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                title="Copy URL"
              >
                <HugeiconsIcon icon={FileExportIcon} size={11} className="text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(file.id, file.originalName ?? file.key); }}
                disabled={deletingId === file.id}
                className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-rose-500/80 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <HugeiconsIcon icon={Delete02Icon} size={11} className="text-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
