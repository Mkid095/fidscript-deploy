'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, LogEntry } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { useLiveTail } from './use-live-tail';
import { STREAM_TAXONOMY, type StreamKey } from './stream-taxonomy';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type Level = typeof LEVELS[number];

interface LogsSdk {
  projects: FidscriptSDK['projects'];
  logs: FidscriptSDK['logs'];
}

const STREAM_KEYS = STREAM_TAXONOMY.map(s => s.key) as StreamKey[];

export function useLogsData(
  selectedProjectId: string,
  streamKey: StreamKey,
  activeLevels: Set<Level>,
  setActiveLevels: (updater: (prev: Set<Level>) => Set<Level>) => void,
  getSdk: () => LogsSdk,
  shellProjectId: string | null,
  searchTerm: string,
) {
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
      const streamName = STREAM_TAXONOMY.find(s => s.key === streamKey)?.name;
      const result = await getSdk().logs.getLogs(selectedProjectId, {
        stream: streamKey === 'default' ? undefined : streamName,
        level: levelFilter || undefined,
        search: searchTerm.trim() || undefined,
        limit: 100,
      });
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedProjectId, streamKey, activeLevels, searchTerm, getSdk]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Live tail appends incoming entries to the existing buffer (preserving history).
  useLiveTail({
    projectId: selectedProjectId || undefined,
    streamKey,
    levelFilter: Array.from(activeLevels).join(','),
    active: live,
    onEntries: useCallback((entries: LogEntry[]) => {
      setLogs(prev => [...prev, ...entries]);
    }, []),
    onError: useCallback((msg: string) => setError(msg), []),
  });

  function toggleLevel(level: Level) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) { if (next.size > 1) next.delete(level); } else next.add(level);
      return next;
    });
  }

  function clearLogs() { setLogs([]); }

  return { projects, logs, loadingProjects, loadingLogs, error, live, setLive, toggleLevel, clearLogs, loadLogs, streamKeys: STREAM_KEYS };
}