'use client';

import { useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';
import { useConfirm } from '@/components/ui/confirm-provider';

interface UseBucketFileActionsProps {
  projectId: string;
  bucketId: string;
  prefix: string;
  getSdk: () => FidscriptSDK;
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
  const confirmFn = useConfirm();

  const handleDelete = useCallback(async (fileId: string, fileName: string) => {
    const ok = await confirmFn({
      title: 'Delete file',
      message: `Delete "${fileName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await getSdk().storage.deleteFile(projectId, bucketId, fileId);
      onFilesChange(prev => prev.filter((f: StorageFile) => f.id !== fileId));
      onBanner(`"${fileName}" deleted`, 'success');
    } catch (err) {
      onBanner(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  }, [projectId, bucketId, getSdk, onFilesChange, onBanner, confirmFn]);

  const handleCopyUrl = useCallback(async (fileId: string, fileName: string, key?: string) => {
    try {
      const url = key
        ? await getSdk().storage.getPresignedUrl(projectId, bucketId, key)
        : await getSdk().storage.getSignedUrl(projectId, bucketId, fileId);
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
    } catch (err) {
      onBanner(err instanceof Error ? err.message : 'Failed to get file URL', 'error');
    }
  }, [projectId, bucketId, getSdk, onBanner]);

  return { handleDelete, handleCopyUrl };
}
