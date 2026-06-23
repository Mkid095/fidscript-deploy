'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { type FidscriptSDK } from '@fidscript/sdk';
import { Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

export interface LogViewerProps {
  projectId: string;
  stream?: string;
  levels?: string[];
  realtime?: boolean;
  loadLogs: (sdk: FidscriptSDK, projectId: string) => Promise<LogEntry[]>;
  resourceId?: string;
  height?: number | string;
  showHeader?: boolean;
}

// RealtimeModule is not exported from the public SDK — mirror the interface locally
interface RealtimeHandler { (event: unknown): void }
interface RealtimeModule {
  subscribeProject(projectId: string, handler: RealtimeHandler): () => void;
}

const ALL_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-slate-500 bg-slate-800',
  info:  'text-blue-400 bg-blue-900/40',
  warn:  'text-yellow-400 bg-yellow-900/40',
  error: 'text-red-400 bg-red-900/40',
  fatal: 'text-red-400 font-bold bg-red-900/60',
};

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  let label: string;
  if (s < 60) label = `${s}s ago`;
  else { const m = Math.floor(s / 60); label = m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; }
  return <span title={new Date(iso).toLocaleString()}>{label}</span>;
}

export default function LogViewer({
  projectId,
  levels = [...ALL_LEVELS],
  realtime = false,
  loadLogs,
  height = 400,
  showHeader = true,
}: LogViewerProps) {
  const { getSdk } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLevels, setActiveLevels] = useState(levels);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const data = await loadLogs(getSdk(), projectId);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [getSdk, loadLogs, projectId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!realtime) return;
    const rt = (getSdk() as FidscriptSDK & { realtime?: RealtimeModule }).realtime;
    if (!rt) return;
    const handler: RealtimeHandler = (evt) => {
      const e = evt as { type?: string; log?: Partial<LogEntry> };
      if (e.type !== 'log.append' && e.type !== 'platform.log.append') return;
      const log = e.log as LogEntry;
      setEntries(prev => [...prev, {
        id: log.id ?? String(Date.now()),
        timestamp: log.timestamp ?? new Date().toISOString(),
        level: (log.level ?? 'info') as LogEntry['level'],
        message: log.message ?? '',
      }]);
      shouldScrollRef.current = true;
    };
    return rt.subscribeProject(projectId, handler);
  }, [realtime, projectId, getSdk]);

  useEffect(() => {
    if (!shouldScrollRef.current) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const h = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="flex flex-col gap-3">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {ALL_LEVELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => setActiveLevels(prev =>
                  prev.includes(lvl) ? prev.filter(x => x !== lvl) : [...prev, lvl])}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors cursor-pointer ${
                  activeLevels.includes(lvl)
                    ? `${LEVEL_COLORS[lvl]} border-transparent`
                    : 'text-slate-600 border-slate-700 bg-transparent hover:text-slate-400'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchLogs}>Refresh</Button>
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-[#080a0d] border border-[#1e2130] rounded-lg overflow-y-auto"
        style={{ height: h }}
        onScroll={() => {
          const el = containerRef.current;
          if (!el) return;
          shouldScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full"><Spinner size="md" /></div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
        ) : entries.filter(e => activeLevels.includes(e.level)).length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">No log entries</div>
        ) : (
          <div className="divide-y divide-[#1e2130]/50">
            {entries.filter(e => activeLevels.includes(e.level)).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-2 hover:bg-[#1e2130]/20">
                <span className="text-[11px] font-mono text-slate-500 flex-shrink-0 mt-0.5">
                  <RelativeTime iso={entry.timestamp} />
                </span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${LEVEL_COLORS[entry.level]}`}>
                  {entry.level}
                </span>
                <span className="text-xs font-mono text-slate-300 leading-relaxed">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
