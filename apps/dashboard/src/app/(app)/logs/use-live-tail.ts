'use client';

import { useEffect } from 'react';
import type { LogEntry } from '@/types';
import { STREAM_TAXONOMY, type StreamKey } from './stream-taxonomy';

const ACCESS_TOKEN_KEY = 'fidscript_access_token';
const LEGACY_TOKEN_KEY = 'fidscript_token';

export interface LiveTailParams {
  projectId: string | undefined;
  streamKey: StreamKey;
  levelFilter: string;
  active: boolean;
  onEntries: (entries: LogEntry[]) => void;
  onError: (msg: string) => void;
}

/**
 * Opens an SSE connection to /api/v1/projects/:id/logs/stream and appends
 * incoming LogEntry payloads via onEntries. Returns a cleanup-only effect.
 */
export function useLiveTail({ projectId, streamKey, levelFilter, active, onEntries, onError }: LiveTailParams): void {
  useEffect(() => {
    if (!active || !projectId) return;
    const token = typeof window !== 'undefined'
      ? (window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(LEGACY_TOKEN_KEY))
      : null;
    if (!token) {
      onError('Not authenticated — cannot start live tail');
      return;
    }
    const streamName = STREAM_TAXONOMY.find(s => s.key === streamKey)?.name ?? 'default';
    const params = new URLSearchParams();
    if (streamKey !== 'default') params.set('stream', streamName);
    if (levelFilter) params.set('level', levelFilter);

    const url = `/api/v1/projects/${projectId}/logs/stream?${params.toString()}`;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          onError(`Live tail failed: HTTP ${res.status}`);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const dataLine = frame
              .split('\n')
              .filter(l => l.startsWith('data:'))
              .map(l => l.slice(5).trim())
              .join('\n');
            if (dataLine) {
              try {
                const entries = JSON.parse(dataLine) as LogEntry[];
                if (Array.isArray(entries) && entries.length > 0) {
                  onEntries(entries);
                }
              } catch {
                // Ignore malformed frame; SSE keepalive comments may be present.
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError(err instanceof Error ? err.message : 'Live tail error');
        }
      }
    })();

    return () => ctrl.abort();
  }, [active, projectId, streamKey, levelFilter, onEntries, onError]);
}