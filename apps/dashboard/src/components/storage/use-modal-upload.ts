'use client';

import { useCallback, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';
import type { UploadItem } from './upload-file-row';

interface UseModalUploadOptions {
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => FidscriptSDK;
  onFilesChange: (files: StorageFile[] | ((prev: StorageFile[]) => StorageFile[])) => void;
  onBanner: (message: string, type: 'success' | 'error') => void;
}

export function useModalUpload({
  projectId, bucketId, prefix, getSdk, onFilesChange, onBanner,
}: UseModalUploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const next: UploadItem[] = Array.from(newFiles).map(file => ({ file, status: 'pending' }));
    setItems(prev => [...prev, ...next]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearDone = useCallback(() => {
    setItems(prev => prev.filter(f => f.status !== 'done'));
  }, []);

  const reset = useCallback(() => setItems([]), []);

  const uploadAll = useCallback(async () => {
    const pending = items.filter(f => f.status === 'pending');
    if (pending.length === 0) return;

    setItems(prev => prev.map(f =>
      f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
    ));

    let ok = 0; let fail = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== 'pending') continue;
      try {
        const uploaded = await getSdk().storage.uploadFile(projectId, bucketId, item.file, item.file.name, {
          contentType: item.file.type || 'application/octet-stream',
          key: prefix ? `${prefix}${item.file.name}` : item.file.name,
        });
        setItems(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'done' as const } : f
        ));
        onFilesChange((prev: StorageFile[]) =>
          prev.find((f: StorageFile) => f.id === uploaded.id) ? prev : [uploaded, ...prev]
        );
        ok++;
      } catch (err) {
        setItems(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error' as const, error: (err as Error).message } : f
        ));
        fail++;
      }
    }

    onBanner(
      fail === 0 ? `Uploaded ${ok} file${ok !== 1 ? 's' : ''}` : `Uploaded ${ok}, ${fail} failed`,
      fail === 0 ? 'success' : 'error',
    );
  }, [items, projectId, bucketId, prefix, getSdk, onFilesChange, onBanner]);

  return { items, addFiles, removeFile, clearDone, reset, uploadAll };
}