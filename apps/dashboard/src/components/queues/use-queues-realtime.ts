'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { FidscriptSDK, RealtimeEventHandler } from '@fidscript/sdk';

export interface QueueStats {
  pending: number;
  delivered: number;
  deadLettered: number;
  jsDepth: number;
}

export interface Queue {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface QueuesRealtimeOptions {
  onQueueCreated?: (queue: Queue) => void;
  onQueueDeleted?: (queue: { id: string }) => void;
  onQueueUpdated?: (queue: Partial<Queue> & { id: string }) => void;
  /** Called when a message is published, acked, retried, dead-lettered, or purged */
  onMessageEvent?: (event: { type: string; queueId: string; projectId: string }) => void;
  /** Called after invocation events to refresh queue stats */
  onStatsUpdated?: (queueId: string, stats: Partial<QueueStats>) => void;
}

export function useQueuesRealtime(
  getSdk: () => FidscriptSDK,
  getToken: () => string | null,
  projectId: string | null,
  opts: QueuesRealtimeOptions,
) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  const subscribe = useCallback(() => {
    if (!projectId) return;
    const sdk = getSdk();
    const rt = sdk.realtime;

    // Connect and subscribe to queues events for this project.
    // The SDK's connect() uses a getter so JWT is refreshed on reconnect.
        const token = getToken();
        if (!token) throw new Error('Not authenticated');
        rt.connect(() => token, projectId)
      .then(() => {
        unsubscribeRef.current = rt.subscribeQueues(projectId, (event) => {
          const type = event.type as string;
          const meta = event.metadata as Record<string, unknown>;

          switch (type) {
            // Queue lifecycle
            case 'queues.created':
              optsRef.current.onQueueCreated?.({
                id: meta.queueId as string,
                name: meta.name as string,
                type: (meta.type as string) ?? 'stream',
                status: 'active',
                createdAt: new Date().toISOString(),
              });
              break;

            case 'queues.deleted':
              optsRef.current.onQueueDeleted?.({ id: meta.queueId as string });
              break;

            case 'queues.updated':
              optsRef.current.onQueueUpdated?.({
                id: meta.queueId as string,
                ...(meta.updatedFields as Partial<Queue>),
              });
              break;

            // Message lifecycle — all update the message count in the UI
            case 'queues.message.published':
            case 'queues.message.acknowledged':
            case 'queues.message.retried':
            case 'queues.message.dead_lettered':
            case 'queues.message.purged':
              optsRef.current.onMessageEvent?.({
                type,
                queueId: meta.queueId as string,
                projectId: meta.projectId as string,
              });
              break;

            // Invocation results — update stats
            case 'queues.invocation.succeeded':
            case 'queues.invocation.failed': {
              const qId = meta.queueId as string;
              optsRef.current.onMessageEvent?.({ type, queueId: qId, projectId: meta.projectId as string });
              // Refresh stats after invocation completes
              if (qId) {
                getSdk().queues.getStats(projectId!, qId)
                  .then(s => optsRef.current.onStatsUpdated?.(qId, {
                    pending: s.pending,
                    delivered: s.delivered,
                    deadLettered: s.deadLettered,
                    jsDepth: s.jsDepth,
                  }))
                  .catch(() => {/* non-fatal */});
              }
              break;
            }
          }
        });
      })
      .catch(err => {
        console.warn('[queues realtime] Failed to connect to realtime gateway', err);
      });
  }, [getSdk, getToken, projectId]);

  useEffect(() => {
    if (!projectId) return;
    subscribe();
    return () => { unsubscribeRef.current?.(); };
  }, [subscribe, projectId]);
}
