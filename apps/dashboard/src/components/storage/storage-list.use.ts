'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Bucket } from './bucket';

export function useStorageList(
  projectId: string,
  getSdk: () => FidscriptSDK,
) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSdk().storage.listBuckets(projectId) as Bucket[];
      setBuckets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);

  const deleteBucket = useCallback(async (bucket: Bucket): Promise<boolean> => {
    try {
      await getSdk().storage.deleteBucket(projectId, bucket.id);
      setBuckets(prev => prev.filter(b => b.id !== bucket.id));
      return true;
    } catch (err) {
      return false;
    }
  }, [projectId, getSdk]);

  return { buckets, setBuckets, loading, error, loadBuckets, deleteBucket };
}
