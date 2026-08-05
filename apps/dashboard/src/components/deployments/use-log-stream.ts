'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogLine } from './log-types';

type SdkLike = { realtime?: unknown };

interface LogStreamEvent {
  type?: string;
  data?: {
    log?: {
      id?: string;
      ts?: string;
      timestamp?: string;
      level?: LogLine['level'] | string;
      text?: string;
      message?: string;
    };
  };
}

function isLogStreamEvent(evt: unknown): evt is LogStreamEvent {
  return typeof evt === 'object' && evt !== null;
}

function isRealtime(rt: unknown): rt is {
  connect: (tokenGetter: () => string, projectId: string) => Promise<void>;
  subscribeDeployments: (deploymentId: string, handler: (evt: unknown) => void) => () => void;
} {
  if (!rt || typeof rt !== 'object') return false;
  const r = rt as { connect?: unknown; subscribeDeployments?: unknown };
  return typeof r.connect === 'function' && typeof r.subscribeDeployments === 'function';
}

/**
 * Subscribes to a deployment's live log stream via the realtime socket
 * and pushes incoming lines into a ref that the viewer can flush in batches.
 */
export function useLogStream({
  enabled,
  deploymentId,
  projectId,
  getSdk,
  pendingRef,
}: {
  enabled: boolean;
  deploymentId: string | undefined;
  projectId: string;
  getSdk: () => SdkLike;
  pendingRef: React.MutableRefObject<LogLine[]>;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !deploymentId) return;

    const sdk = getSdk();
    const rt = sdk?.realtime;
    if (!isRealtime(rt)) return;

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
      : '';

    setIsStreaming(true);
    let cancelled = false;

    void rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;

      const handler = (evt: unknown) => {
        if (!isLogStreamEvent(evt)) return;
        if (evt.type !== 'logs.log.ingested' && evt.type !== 'deployment.log') return;

        const log = evt.data?.log;
        if (!log) return;

        const newLog: LogLine = {
          id: log.id ?? `stream-${Date.now()}-${Math.random()}`,
          ts: log.ts ?? log.timestamp ?? new Date().toISOString(),
          level: (log.level ?? 'info') as LogLine['level'],
          text: log.text ?? log.message ?? '',
        };

        pendingRef.current = [...pendingRef.current, newLog];
        setLastUpdate(new Date());
      };

      const unsub = rt.subscribeDeployments(deploymentId, handler);
      if (cancelled) unsub();
    });

    return () => {
      cancelled = true;
      setIsStreaming(false);
    };
  }, [enabled, deploymentId, projectId, getSdk, pendingRef]);

  return { isStreaming, lastUpdate };
}