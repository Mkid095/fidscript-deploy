'use client';

import type { StorageFile } from '@/types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileTypeInfo(mimeType?: string) {
  if (!mimeType) return { icon: 'icons8:file', label: 'Unknown', color: 'text-[var(--text-dim)]' };
  if (mimeType.startsWith('image/')) return { icon: 'icons8:image-file', label: 'Image', color: 'text-violet-400' };
  if (mimeType.startsWith('video/')) return { icon: 'icons8:video-file', label: 'Video', color: 'text-rose-400' };
  if (mimeType.startsWith('audio/')) return { icon: 'icons8:music', label: 'Audio', color: 'text-amber-400' };
  if (mimeType === 'application/pdf') return { icon: 'icons8:pdf', label: 'PDF', color: 'text-red-400' };
  if (mimeType.match(/zip|tar|gzip|compressed/)) return { icon: 'icons8:compress', label: 'Archive', color: 'text-emerald-400' };
  if (mimeType.startsWith('text/')) return { icon: 'icons8:file', label: 'Text', color: 'text-blue-400' };
  return { icon: 'icons8:file', label: 'File', color: 'text-[var(--text-dim)]' };
}

export function isPreviewable(mimeType?: string) {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

export function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'icons8:image-file';
  if (mimeType.startsWith('video/')) return 'icons8:video-file';
  if (mimeType.startsWith('audio/')) return 'icons8:music';
  if (mimeType === 'application/pdf') return 'icons8:pdf';
  return 'icons8:file';
}
