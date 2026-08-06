'use client';

import { useState, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export interface PublishMessageInputs {
  body: string;
  delaySeconds?: number;
  headers?: Record<string, string>;
}

export function usePublishMessage(
  projectId: string,
  queueId: string,
  getSdk: () => FidscriptSDK,
) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(async (inputs: PublishMessageInputs): Promise<boolean> => {
    setPublishing(true);
    setError(null);
    try {
      let parsed: string | object;
      try {
        parsed = JSON.parse(inputs.body);
      } catch {
        parsed = inputs.body;
      }
      const sdk = getSdk();
      const normalizedHeaders: Record<string, string> | undefined = inputs.headers
        ? Object.fromEntries(
            Object.entries(inputs.headers).filter(([, v]) => v.trim().length > 0),
          )
        : undefined;
      await sdk.queues.publish(projectId, queueId, parsed, {
        delaySeconds: inputs.delaySeconds,
        headers: normalizedHeaders && Object.keys(normalizedHeaders).length > 0 ? normalizedHeaders : undefined,
      });
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
