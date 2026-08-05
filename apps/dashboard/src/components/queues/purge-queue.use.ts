'use client';

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

interface PurgeResult {
  purged: number;
  dlqPurged: number;
}

export function usePurgeQueue(
  projectId: string,
  queueId: string,
  getSdk: () => FidscriptSDK,
) {
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<PurgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purge = useCallback(async (includeDlq: boolean): Promise<PurgeResult | null> => {
    setPurging(true);
    setError(null);
    try {
      const sdk = getSdk();
      const res = await sdk.queues.purge(projectId, queueId, includeDlq);
      setResult(res);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge queue');
      return null;
    } finally {
      setPurging(false);
    }
  }, [projectId, queueId, getSdk]);

  return { purging, result, error, purge };
}
