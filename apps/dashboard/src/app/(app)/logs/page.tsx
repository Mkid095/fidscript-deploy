'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createFidscript } from '@fidscript/sdk';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';

import type { Project, LogEntry } from '@/types';

const STREAMS = ['default', 'build', 'access', 'error'] as const;
const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-slate-700 text-slate-400',
  info: 'bg-blue-900 text-blue-400',
  warn: 'bg-yellow-900 text-yellow-400',
  error: 'bg-red-900 text-red-400',
  fatal: 'bg-red-900 text-red-400 font-bold',
};

type Stream = typeof STREAMS[number];
type Level = typeof LEVELS[number];

export default function LogsPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam ?? '');
  const [stream, setStream] = useState<Stream>('default');
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [live, setLive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<AsyncIterator<LogEntry> | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) { setLoadingProjects(false); return; }
      try {
        const sdk = createFidscript({ apiKey: token });
        const data = await sdk.projects.list();
        setProjects(data);
        if (!selectedProjectId && data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  async function loadLogs() {
    if (!selectedProjectId) return;
    setLoadingLogs(true);
    setError(null);
    try {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const levelFilter = Array.from(activeLevels).join(',');
      const result = await sdk.logs.getLogs(selectedProjectId, {
        stream,
        level: levelFilter || undefined,
        limit: 100,
      });
      setLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    if (!selectedProjectId) return;
    loadLogs();
  }, [selectedProjectId, stream, activeLevels]);

  // Live tail
  useEffect(() => {
    if (!live || !selectedProjectId) {
      streamRef.current = null;
      return;
    }

    let cancelled = false;

    async function startStream() {
      const token = localStorage.getItem('fidscript_token');
      if (!token) return;
      const sdk = createFidscript({ apiKey: token });
      const levelFilter = Array.from(activeLevels).join(',');
      const iterator = sdk.logs.streamLogs(selectedProjectId, {
        stream,
        level: levelFilter || undefined,
      });
      streamRef.current = iterator;

      try {
        for await (const entry of iterator) {
          if (cancelled) break;
          setLogs(prev => [entry, ...prev].slice(0, 500));
        }
      } catch {
        // stream ended
      }
    }

    startStream();
    return () => { cancelled = true; streamRef.current = null; };
  }, [live, selectedProjectId, stream, activeLevels]);

  useEffect(() => {
    if (autoScroll) {
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  function toggleLevel(level: Level) {
    setActiveLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size > 1) next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }

  function handleProjectChange(id: string) {
    setSelectedProjectId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('project', id);
    window.location.href = url.toString();
  }

  function clearLogs() {
    setLogs([]);
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects"
        description="Create a project first to view logs."
        action={
          <a href="/projects">
            <Button variant="primary" size="sm">Go to Projects</Button>
          </a>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-200 mb-1">Logs</h1>
          <p className="text-sm text-slate-500">{logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadLogs}>Refresh</Button>
          <Button variant="ghost" size="sm" onClick={clearLogs}>Clear</Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="border border-[#1e2130] mb-6">
        <div className="flex flex-col gap-4">
          {/* Project selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={e => handleProjectChange(e.target.value)}
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded-lg px-3 py-2 text-sm min-w-52"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Stream selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Stream</label>
            <div className="flex gap-2 flex-wrap">
              {STREAMS.map(s => (
                <button
                  key={s}
                  onClick={() => setStream(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    stream === s
                      ? 'bg-blue-900 text-blue-300 border-blue-600'
                      : 'bg-[#0f1117] text-slate-400 border-[#1e2130] hover:border-slate-500'
                  } bg-none cursor-pointer`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Level filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Level</label>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => toggleLevel(l)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeLevels.has(l)
                      ? `${LEVEL_COLORS[l]} border-transparent`
                      : 'bg-[#0f1117] text-slate-600 border-[#1e2130] hover:border-slate-500'
                  } bg-none cursor-pointer`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Live tail toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={live}
                onChange={e => setLive(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-300">Live tail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-sm text-slate-300">Auto-scroll</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

      {/* Log list */}
      {loadingLogs && logs.length === 0 ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState title="No logs" description="No log entries match the current filters." />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <div
            ref={listRef}
            className="bg-[#0a0a0f] text-slate-300 font-mono text-xs overflow-y-auto"
            style={{ maxHeight: 600 }}
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0a0f] border-b border-[#1e2130]">
                <tr>
                  <th className="text-left text-slate-500 font-medium px-4 py-2 w-40">Time</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-2 w-20">Level</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(entry => (
                  <tr key={entry.id} className="border-b border-[#1e2130]/50 hover:bg-[#1e2130]/20">
                    <td className="px-4 py-1.5 text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[entry.level] ?? 'bg-slate-700 text-slate-300'}`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-slate-300 whitespace-pre-wrap break-all">
                      {entry.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
