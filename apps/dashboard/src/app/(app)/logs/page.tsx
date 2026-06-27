'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';
import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project, LogEntry } from '@/types';

const STREAMS = ['default', 'build', 'access', 'error'] as const;
const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-[var(--rail)] text-[var(--text-muted)]',
  info: 'bg-blue-900 text-[var(--accent)]',
  warn: 'bg-yellow-900 text-[var(--warning)]',
  error: 'bg-red-900 text-[var(--danger)]',
  fatal: 'bg-red-900 text-[var(--danger)] font-bold',
};

type Stream = typeof STREAMS[number];
type Level = typeof LEVELS[number];

export default function LogsPage() {
  const { getSdk } = useAuth();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project');
  const shellProjectId = useShellProjectId();

  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState<string>(projectIdParam ?? '');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [stream, setStream] = useState<Stream>('default');
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(LEVELS));
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [live, setLive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<AsyncIterator<LogEntry> | null>(null);

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if (!pickedProjectId && (data.projects ?? []).length > 0) {
          setPickedProjectId((data.projects ?? [])[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSdk, shellProjectId]);

  async function loadLogs() {
    if (!selectedProjectId) return;
    setLoadingLogs(true);
    setError(null);
    try {
      const sdk = getSdk();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, stream, activeLevels, getSdk]);

  // Live tail
  useEffect(() => {
    if (!live || !selectedProjectId) {
      streamRef.current = null;
      return;
    }

    let cancelled = false;

    async function startStream() {
      const sdk = getSdk();
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
  }, [live, selectedProjectId, stream, activeLevels, getSdk]);

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
    setPickedProjectId(id);
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
          <Link href="/projects">
            <Button variant="primary" size="sm">Go to Projects</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Logs</h1>
          <p className="text-sm text-[var(--text-muted)]">{logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadLogs}>Refresh</Button>
          <Button variant="ghost" size="sm" onClick={clearLogs}>Clear</Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="border border-[var(--rail)] mb-6">
        <div className="flex flex-col gap-4">
          {/* Project selector — hidden when the project shell already chose a project */}
          {!shellProjectId && (
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
              <select
                value={pickedProjectId}
                onChange={e => handleProjectChange(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stream selector */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2">Stream</label>
            <div className="flex gap-2 flex-wrap">
              {STREAMS.map(s => (
                <button
                  key={s}
                  onClick={() => setStream(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    stream === s
                      ? 'bg-blue-900 text-[var(--accent)] border-[var(--accent)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--rail)] hover:border-slate-500'
                  } bg-none cursor-pointer`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Level filter */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2">Level</label>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => toggleLevel(l)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeLevels.has(l)
                      ? `${LEVEL_COLORS[l]} border-transparent`
                      : 'bg-[var(--surface-2)] text-[var(--text-dim)] border-[var(--rail)] hover:border-slate-500'
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
                className="accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-muted)]">Live tail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-muted)]">Auto-scroll</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {/* Log list */}
      {loadingLogs && logs.length === 0 ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState title="No logs" description="No log entries match the current filters." />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] overflow-hidden">
          <div
            ref={listRef}
            className="bg-[#0a0a0f] text-[var(--text-muted)] font-mono text-xs overflow-y-auto"
            style={{ maxHeight: 600 }}
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0a0f] border-b border-[var(--rail)]">
                <tr>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2 w-40">Time</th>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2 w-20">Level</th>
                  <th className="text-left text-[var(--text-muted)] font-medium px-4 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(entry => (
                  <tr key={entry.id} className="border-b border-[var(--rail)]/50 hover:bg-[var(--rail)]/20">
                    <td className="px-4 py-1.5 text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[entry.level] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-[var(--text-muted)] whitespace-pre-wrap break-all">
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
