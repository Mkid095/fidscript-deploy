'use client';

import { Card } from '@fidscript/ui';
import type { Project } from '@/types';
import { STREAM_TAXONOMY, type StreamKey } from './stream-taxonomy';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
const LEVEL_COLORS: Record<string, string> = {
  debug: 'bg-[var(--rail)] text-[var(--text-muted)]',
  info: 'bg-blue-900 text-[var(--accent)]',
  warn: 'bg-yellow-900 text-[var(--warning)]',
  error: 'bg-red-900 text-[var(--danger)]',
  fatal: 'bg-red-900 text-[var(--danger)] font-bold',
};
type Level = typeof LEVELS[number];

interface LogFiltersProps {
  projects: Project[];
  pickedProjectId: string;
  shellProjectId: string | null;
  streamKey: StreamKey;
  activeLevels: Set<Level>;
  live: boolean;
  searchTerm: string;
  onProjectChange: (id: string) => void;
  onStreamChange: (s: StreamKey) => void;
  onToggleLevel: (l: Level) => void;
  onLiveChange: (v: boolean) => void;
  onSearchChange: (v: string) => void;
}

export function LogFilters({
  projects, pickedProjectId, shellProjectId, streamKey, activeLevels, live, searchTerm,
  onProjectChange, onStreamChange, onToggleLevel, onLiveChange, onSearchChange,
}: LogFiltersProps) {
  return (
    <Card className="border border-[var(--rail)] mb-6">
      <div className="flex flex-col gap-4">
        {!shellProjectId && (
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
            <select value={pickedProjectId} onChange={e => onProjectChange(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="log-search" className="block text-xs text-[var(--text-muted)] mb-1">Search</label>
          <input
            id="log-search"
            type="search"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter messages…"
            className="w-full max-w-md bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm placeholder:text-[var(--text-dim)]/50 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2">Stream</label>
          <div className="flex gap-2 flex-wrap">
            {STREAM_TAXONOMY.map(s => (
              <button key={s.key} onClick={() => onStreamChange(s.key)} title={s.description}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  streamKey === s.key ? 'bg-blue-900 text-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--rail)] hover:border-slate-500'
                } bg-none cursor-pointer`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2">Level</label>
          <div className="flex gap-2 flex-wrap">
            {LEVELS.map(l => (
              <button key={l} onClick={() => onToggleLevel(l)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeLevels.has(l) ? `${LEVEL_COLORS[l]} border-transparent` : 'bg-[var(--surface-2)] text-[var(--text-dim)] border-[var(--rail)] hover:border-slate-500'
                } bg-none cursor-pointer`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={live} onChange={e => onLiveChange(e.target.checked)} className="accent-[var(--accent)]" />
            <span className="text-sm text-[var(--text-muted)]">Live tail</span>
          </label>
        </div>
      </div>
    </Card>
  );
}