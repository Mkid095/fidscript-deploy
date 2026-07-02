'use client';

import { useCallback, useState } from 'react';
import type { StorageFile } from '@/types';

interface UseUploadFilesProps {
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => { storage: { uploadFile: Function } };
  onFilesChange: (files: StorageFile[] | ((prev: StorageFile[]) => StorageFile[])) => void;
  onBanner: (message: string, type: 'success' | 'error') => void;
}

export function useUploadFiles({
  projectId,
  bucketId,
  prefix,
  getSdk,
  onFilesChange,
  onBanner,
}: UseUploadFilesProps) {
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;
    setUploading(true);
    let ok = 0; let fail = 0;
    for (const file of fileList) {
      try {
        const uploaded = await getSdk().storage.uploadFile(projectId, bucketId, file, file.name, {
          contentType: file.type || 'application/octet-stream',
          key: prefix ? `${prefix}${file.name}` : file.name,
        });
        onFilesChange(prev => prev.find((f: StorageFile) => f.id === uploaded.id) ? prev : [uploaded, ...prev]);
        ok++;
      } catch { fail++; }
    }
    setUploading(false);
    onBanner(
      fail === 0 ? `Uploaded ${ok} file${ok !== 1 ? 's' : ''}` : `Uploaded ${ok}, ${fail} failed`,
      fail === 0 ? 'success' : 'error',
    );
  }, [projectId, bucketId, prefix, getSdk, onFilesChange, onBanner]);

  return { uploadFiles, uploading };
}
