'use client';

import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Card } from '@fidscript/ui';
import type { StorageFile } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileTypeInfo(mimeType?: string) {
  if (!mimeType) return { icon: 'icons8:file', label: 'Unknown', color: 'text-[var(--text-dim)]' };
  if (mimeType.startsWith('image/')) return { icon: 'icons8:image-file', label: 'Image', color: 'text-violet-400' };
  if (mimeType.startsWith('video/')) return { icon: 'icons8:video-file', label: 'Video', color: 'text-rose-400' };
  if (mimeType.startsWith('audio/')) return { icon: 'icons8:music', label: 'Audio', color: 'text-amber-400' };
  if (mimeType === 'application/pdf') return { icon: 'icons8:pdf', label: 'PDF', color: 'text-red-400' };
  if (mimeType.match(/zip|tar|gzip|compressed/)) return { icon: 'icons8:compress', label: 'Archive', color: 'text-emerald-400' };
  if (mimeType.startsWith('text/')) return { icon: 'icons8:file', label: 'Text', color: 'text-blue-400' };
  return { icon: 'icons8:file', label: 'File', color: 'text-[var(--text-dim)]' };
}

function isPreviewable(mimeType?: string) {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

interface FileGridProps {
  files: StorageFile[];
  previewUrls: Record<string, string>;
  deletingId: string | null;
  onPreview: (file: StorageFile) => void;
  onCopyUrl: (fileId: string, name: string) => void;
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
                    <Icon icon={typeInfo.icon} width={28} height={28} className={typeInfo.color} />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {previewable && <Icon icon="icons8:picture" width={20} height={20} className="text-white" />}
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
                  <Icon icon="icons8:picture" width={11} height={11} className="text-white" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onCopyUrl(file.id, file.originalName ?? file.key); }}
                className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                title="Copy URL"
              >
                <Icon icon="icons8:export" width={11} height={11} className="text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(file.id, file.originalName ?? file.key); }}
                disabled={deletingId === file.id}
                className="w-6 h-6 rounded bg-black/60 flex items-center justify-center hover:bg-rose-500/80 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Icon icon="icons8:trash" width={11} height={11} className="text-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
