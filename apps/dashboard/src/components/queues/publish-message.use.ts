'use client';

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export function usePublishMessage(
  projectId: string,
  queueId: string,
  getSdk: () => FidscriptSDK,
) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(async (message: string): Promise<boolean> => {
    setPublishing(true);
    setError(null);
    try {
      let parsed: string | object;
      try {
        parsed = JSON.parse(message);
      } catch {
        parsed = message;
      }
      const sdk = getSdk();
      await sdk.queues.publish(projectId, queueId, parsed);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish message');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [projectId, queueId, getSdk]);

  return { publishing, error, publish };
}
