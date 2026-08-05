'use client';

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';

interface UseFilePreviewOptions {
  projectId: string;
  bucketId: string;
  getSdk: () => FidscriptSDK;
  onPreviewUrlCached?: (fileId: string, url: string) => void;
}

export function useFilePreview({ projectId, bucketId, getSdk, onPreviewUrlCached }: UseFilePreviewOptions) {
  const [file, setFile] = useState<StorageFile | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const open = useCallback(async (next: StorageFile) => {
    setFile(next);
    setUrl(null);
    setLoading(true);
    try {
      const signed = await getSdk().storage.getSignedUrl(projectId, bucketId, next.id);
      setUrl(signed);
      if (next.mimeType?.startsWith('image/') && onPreviewUrlCached) {
        onPreviewUrlCached(next.id, signed);
      }
    } catch { setUrl(null); }
    finally { setLoading(false); }
  }, [projectId, bucketId, getSdk, onPreviewUrlCached]);

  const close = useCallback(() => {
    setFile(null);
    setUrl(null);
  }, []);

  return { file, url, loading, open, close };
}