'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Project, LogEntry } from '@/types';

const STREAMS = ['default', 'build', 'access', 'error'] as const;
const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type Stream = typeof STREAMS[number];
type Level = typeof LEVELS[number];

export function useLogsData(selectedProjectId: string, stream: Stream, activeLevels: Set<Level>, getSdk: () => any, shellProjectId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const streamRef = useRef<AsyncIterator<LogEntry> | null>(null);

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if (!pickedProjectId && (data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  const loadLogs = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingLogs(true);
    setError(null);
    try {
      const sdk = getSdk();
      const levelFilter = Array.from(activeLevels).join(',');
      const result = await sdk.logs.getLogs(selectedProjectId, { stream, level: levelFilter || undefined, limit: 100 });
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedProjectId, stream, activeLevels, getSdk]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    if (!live || !selectedProjectId) { streamRef.current = null; return; }
    let cancelled = false;
    async function startStream() {
      const sdk = getSdk();
      const levelFilter = Array.from(activeLevels).join(',');
      const iterator = sdk.logs.streamLogs(selectedProjectId, { stream, level: levelFilter || undefined });
      streamRef.current = iterator;
      try {
        for await (const entry of iterator) {
          if (cancelled) break;
          setLogs(prev => [entry, ...prev].slice(0, 500));
        }
      } catch { /* stream ended */ }
    }
    startStream();
    return () => { cancelled = true; streamRef.current = null; };
  }, [live, selectedProjectId, stream, activeLevels, getSdk]);

  function toggleLevel(level: Level) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) { if (next.size > 1) next.delete(level); } else { next.add(level); }
      return next;
    });
  }

  function clearLogs() { setLogs([]); }

  return { projects, pickedProjectId, setPickedProjectId, logs, loadingProjects, loadingLogs, error, live, setLive, toggleLevel, clearLogs, loadLogs };
}
