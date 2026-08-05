'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { StorageFile } from '@/types';

export function useBucketFiles(
  projectId: string,
  bucketId: string,
  prefix: string,
  getSdk: () => FidscriptSDK,
) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSdk().storage.listFiles(projectId, bucketId, {
        prefix: prefix || undefined,
        limit: 50,
      });
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, bucketId, prefix, getSdk]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  return { files, setFiles, loading, error, loadFiles };
}
