'use client';

import { useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { QueueStats } from './use-queues-realtime';
import type { Queue } from './queue-card';

interface UseQueuesListHandlersOptions {
  projectId: string | null;
  getSdk: () => FidscriptSDK;
  setQueues: React.Dispatch<React.SetStateAction<Queue[]>>;
  setQueueStats: React.Dispatch<React.SetStateAction<Record<string, QueueStats>>>;
  setShowCreate: React.Dispatch<React.SetStateAction<boolean>>;
  setCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteTarget: React.Dispatch<React.SetStateAction<Queue | null>>;
  setDeleting: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useQueuesListHandlers({
  projectId,
  getSdk,
  setQueues,
  setQueueStats,
  setShowCreate,
  setCreating,
  setDeleteTarget,
  setDeleting,
}: UseQueuesListHandlersOptions) {
  const loadQueues = useCallback(async () => {
    const sdk = getSdk();
    if (!projectId) return;
    setCreating(true);
    try {
      const list = await sdk.queues.list(projectId);
      setQueues(list);

      const stats: Record<string, QueueStats> = {};
      await Promise.all(
        list.map(async (q) => {
          try {
            const s = await sdk.queues.getStats(projectId, q.id);
            stats[q.id] = {
            pending: s.pending,
            delivered: s.delivered,
            acknowledged: s.acknowledged,
            failed: s.failed,
            deadLettered: s.deadLettered,
            jsDepth: s.jsDepth,
          };
        } catch {
          stats[q.id] = { pending: 0, delivered: 0, acknowledged: 0, failed: 0, deadLettered: 0, jsDepth: 0 };
        }
        }),
      );
      setQueueStats(stats);
    } catch (err) {
      console.error('Failed to load queues', err);
    } finally {
      setCreating(false);
    }
  }, [getSdk, projectId, setQueues, setQueueStats, setCreating]);

  const handleCreate = useCallback(async (options: {
    name: string;
    type: string;
    retentionDays?: number;
    maxMessages?: number;
    maxBytes?: number;
    replicas?: number;
    retryAttempts?: number;
    retryDelaySeconds?: number;
    deadLetterQueue?: string;
  }) => {
    if (!projectId) return;
    setCreating(true);
    try {
      const sdk = getSdk();
      await sdk.queues.create(projectId, options);
      setShowCreate(false);
      await loadQueues();
    } catch (err) {
      console.error('Failed to create queue', err);
    } finally {
      setCreating(false);
    }
  }, [getSdk, projectId, setCreating, setShowCreate, loadQueues]);

  const handleDelete = useCallback(async (deleteTarget: Queue) => {
    if (!projectId) return;
    setDeleting(true);
    try {
      const sdk = getSdk();
      await sdk.queues.delete(projectId, deleteTarget.id);
      setDeleteTarget(null);
      await loadQueues();
    } catch (err) {
      console.error('Failed to delete queue', err);
    } finally {
      setDeleting(false);
    }
  }, [getSdk, projectId, setDeleting, setDeleteTarget, loadQueues]);

  return { loadQueues, handleCreate, handleDelete };
}
