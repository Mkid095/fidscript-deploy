'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Queue, QueueStats, QueueMessage } from './use-queues-realtime';

interface UseQueueDetailDataOptions {
  projectId: string | null;
  queueId: string;
  getSdk: () => FidscriptSDK;
}

export function useQueueDetailData({ projectId, queueId, getSdk }: UseQueueDetailDataOptions) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    const sdk = getSdk();
    if (!projectId) return;
    try {
      const [q, s, msgResult] = await Promise.all([
        sdk.queues.get(projectId, queueId),
        sdk.queues.getStats(projectId, queueId),
        sdk.queues.getMessages(projectId, queueId, { limit: 50 }),
      ]);
      setQueue(q);
      setStats({
        pending: s.pending,
        delivered: s.delivered,
        acknowledged: s.acknowledged,
        failed: s.failed,
        deadLettered: s.deadLettered,
        jsDepth: s.jsDepth,
      });
      setMessages(msgResult.messages);
    } catch (err) {
      console.error('Failed to load queue', err);
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId, queueId]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  return { queue, stats, messages, loading, loadQueue, setMessages };
}
