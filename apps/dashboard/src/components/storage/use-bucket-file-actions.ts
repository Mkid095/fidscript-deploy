'use client';

import { useCallback } from 'react';
import type { StorageFile } from '@/types';

interface UseBucketFileActionsProps {
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => { storage: { deleteFile: Function; getSignedUrl: Function } };
  onFilesChange: (files: StorageFile[] | ((prev: StorageFile[]) => StorageFile[])) => void;
  onBanner: (message: string, type: 'success' | 'error') => void;
}

export function useBucketFileActions({
  projectId,
  bucketId,
  prefix,
  getSdk,
  onFilesChange,
  onBanner,
}: UseBucketFileActionsProps) {
  const handleDelete = useCallback(async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      await getSdk().storage.deleteFile(projectId, bucketId, fileId);
      onFilesChange(prev => prev.filter((f: StorageFile) => f.id !== fileId));
      onBanner(`"${fileName}" deleted`, 'success');
    } catch (err) {
      onBanner(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }, [projectId, bucketId, getSdk, onFilesChange, onBanner]);

  const handleCopyUrl = useCallback(async (fileId: string, fileName: string) => {
    try {
      const url = await getSdk().storage.getSignedUrl(projectId, bucketId, fileId);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      onBanner(`URL for "${fileName}" copied to clipboard`, 'success');
    } catch {
      onBanner('Failed to get file URL', 'error');
    }
  }, [projectId, bucketId, getSdk, onBanner]);

  return { handleDelete, handleCopyUrl };
}
