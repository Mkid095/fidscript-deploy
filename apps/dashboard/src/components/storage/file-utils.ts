'use client';

import {
  File01Icon,
  Image01Icon,
  Video01Icon,
  MusicNote01Icon,
  Pdf01Icon,
  FileZipIcon,
} from '@hugeicons/core-free-icons';
import type { StorageFile } from '@/types';

type FileTypeIcon = typeof File01Icon;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileTypeInfo(mimeType?: string): { Icon: FileTypeIcon; label: string; color: string } {
  if (!mimeType) return { Icon: File01Icon, label: 'Unknown', color: 'text-[var(--text-dim)]' };
  if (mimeType.startsWith('image/')) return { Icon: Image01Icon, label: 'Image', color: 'text-violet-400' };
  if (mimeType.startsWith('video/')) return { Icon: Video01Icon, label: 'Video', color: 'text-rose-400' };
  if (mimeType.startsWith('audio/')) return { Icon: MusicNote01Icon, label: 'Audio', color: 'text-amber-400' };
  if (mimeType === 'application/pdf') return { Icon: Pdf01Icon, label: 'PDF', color: 'text-red-400' };
  if (mimeType.match(/zip|tar|gzip|compressed/)) return { Icon: FileZipIcon, label: 'Archive', color: 'text-emerald-400' };
  if (mimeType.startsWith('text/')) return { Icon: File01Icon, label: 'Text', color: 'text-blue-400' };
  return { Icon: File01Icon, label: 'File', color: 'text-[var(--text-dim)]' };
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

export function fileIcon(mimeType: string): FileTypeIcon {
  if (mimeType.startsWith('image/')) return Image01Icon;
  if (mimeType.startsWith('video/')) return Video01Icon;
  if (mimeType.startsWith('audio/')) return MusicNote01Icon;
  if (mimeType === 'application/pdf') return Pdf01Icon;
  return File01Icon;
}
