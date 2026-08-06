'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, LogEntry } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

const STREAMS = ['default', 'build', 'access', 'error'] as const;
const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type Stream = typeof STREAMS[number];
type Level = typeof LEVELS[number];

interface LogsSdk {
  projects: FidscriptSDK['projects'];
  logs: FidscriptSDK['logs'];
}

const ACCESS_TOKEN_KEY = 'fidscript_access_token';
const LEGACY_TOKEN_KEY = 'fidscript_token';

export function useLogsData(selectedProjectId: string, stream: Stream, activeLevels: Set<Level>, setActiveLevels: (updater: (prev: Set<Level>) => Set<Level>) => void, getSdk: () => LogsSdk, shellProjectId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const data = await getSdk().projects.list();
        setProjects(data.projects ?? []);
      } catch { /* project selector remains empty */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  const loadLogs = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingLogs(true);
    setError(null);
    try {
      const levelFilter = Array.from(activeLevels).join(',');
      const result = await getSdk().logs.getLogs(selectedProjectId, {
        stream: stream === 'default' ? undefined : stream,
        level: levelFilter || undefined,
        limit: 100,
      });
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedProjectId, stream, activeLevels, getSdk]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  /**
   * Live tail: opens an SSE connection to /api/v1/projects/:id/logs/stream and
   * appends incoming LogEntry payloads to the existing logs buffer. Initial load
   * is handled separately via loadLogs() above so the user sees recent history
   * before tailing begins.
   */
  useEffect(() => {
    if (!live || !selectedProjectId) return;
    const token = typeof window !== 'undefined'
      ? (window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(LEGACY_TOKEN_KEY))
      : null;
    if (!token) {
      setError('Not authenticated — cannot start live tail');
      return;
    }
    const params = new URLSearchParams();
    if (stream !== 'default') params.set('stream', stream);
    const levelFilter = Array.from(activeLevels).join(',');
    if (levelFilter) params.set('level', levelFilter);

    const url = `/api/v1/projects/${selectedProjectId}/logs/stream?${params.toString()}`;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          setError(`Live tail failed: HTTP ${res.status}`);
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
          // SSE frames are separated by a blank line.
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
                  setLogs(prev => [...prev, ...entries]);
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
          setError(err instanceof Error ? err.message : 'Live tail error');
        }
      }
    })();

    return () => ctrl.abort();
  }, [live, selectedProjectId, stream, activeLevels]);

  function toggleLevel(level: Level) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) { if (next.size > 1) next.delete(level); } else next.add(level);
      return next;
    });
  }

  function clearLogs() { setLogs([]); }

  return { projects, logs, loadingProjects, loadingLogs, error, live, setLive, toggleLevel, clearLogs, loadLogs };
}
