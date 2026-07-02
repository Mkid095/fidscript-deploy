'use client';

import { Icon } from '@iconify/react';
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

interface FileTableProps {
  files: StorageFile[];
  deletingId: string | null;
  onPreview: (file: StorageFile) => void;
  onCopyUrl: (fileId: string, name: string) => void;
  onDelete: (fileId: string, name: string) => void;
}

export function FileTable({ files, deletingId, onPreview, onCopyUrl, onDelete }: FileTableProps) {
  return (
    <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--surface-2)] border-b border-[var(--rail)]">
            <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] px-4 py-2.5">Name</th>
            <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] px-4 py-2.5 w-24 hidden md:table-cell">Type</th>
            <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] px-4 py-2.5 w-24 hidden lg:table-cell">Size</th>
            <th className="text-left text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] px-4 py-2.5 w-40 hidden lg:table-cell">Uploaded</th>
            <th className="text-right text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)] px-4 py-2.5 w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => {
            const typeInfo = getFileTypeInfo(file.mimeType);
            return (
              <tr key={file.id} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--rail)]/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-[var(--rail)]">
                      <Icon icon={typeInfo.icon} width={12} height={12} className={typeInfo.color} />
                    </div>
                    <div className="min-w-0">
                      <button
                        onClick={() => isPreviewable(file.mimeType) ? onPreview(file) : null}
                        className={`text-[var(--text)] font-medium truncate block max-w-[200px] md:max-w-[280px] hover:underline ${isPreviewable(file.mimeType) ? 'cursor-pointer' : 'cursor-default'}`}
                        title={file.originalName ?? file.key}
                      >
                        {file.originalName ?? file.key}
                      </button>
                      <p className="text-[10px] text-[var(--text-dim)] md:hidden mt-0.5">
                        {formatBytes(file.sizeBytes)} &middot; {typeInfo.label}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-[10px] font-medium">{typeInfo.label}</span>
                </td>
                <td className="px-4 py-3 text-[var(--text-dim)] hidden lg:table-cell text-[10px]">
                  {formatBytes(file.sizeBytes)}
                </td>
                <td className="px-4 py-3 text-[var(--text-dim)] hidden lg:table-cell text-[10px]">
                  {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {isPreviewable(file.mimeType) && (
                      <button
                        onClick={() => onPreview(file)}
                        className="p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
                        title="Preview"
                      >
                        <Icon icon="icons8:picture" width={12} height={12} />
                      </button>
                    )}
                    <button
                      onClick={() => onCopyUrl(file.id, file.originalName ?? file.key)}
                      className="p-1.5 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
                      title="Copy URL"
                    >
                      <Icon icon="icons8:export" width={12} height={12} />
                    </button>
                    <button
                      onClick={() => onDelete(file.id, file.originalName ?? file.key)}
                      disabled={deletingId === file.id}
                      className="p-1.5 rounded text-[var(--text-dim)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Icon icon="icons8:trash" width={12} height={12} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
