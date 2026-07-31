'use client';

import { Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Download01Icon, RefreshIcon, CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';

import { LOG_LEVELS, LEVEL_STYLE } from './log-types';

interface LogToolbarProps {
  inFlight: boolean;
  filteredLength: number;
  search: string;
  onSearchChange: (v: string) => void;
  activeLevels: Set<string>;
  onToggleLevel: (lvl: string) => void;
  onCopyAll: () => void;
  onDownloadLogs: () => void;
  autoScroll: boolean;
  onAutoScrollToggle: () => void;
  isStreaming?: boolean;
  lastUpdate?: Date | null;
}

export function LogToolbar({
  inFlight,
  filteredLength,
  search,
  onSearchChange,
  activeLevels,
  onToggleLevel,
  onCopyAll,
  onDownloadLogs,
  autoScroll,
  onAutoScrollToggle,
  isStreaming = false,
  lastUpdate,
}: LogToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--rail)]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Build logs</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--accent)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Live
          </span>
        )}
        {inFlight && filteredLength === 0 && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
            <Spinner size="sm" /> Streaming…
          </span>
        )}
        {lastUpdate && !isStreaming && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
            <HugeiconsIcon icon={CheckmarkCircle03Icon} size={10} className="text-[var(--success)]" />
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 flex-1 w-full sm:w-auto">
        {LOG_LEVELS.map(lvl => (
          <button
            key={lvl}
            onClick={() => onToggleLevel(lvl)}
            className={`text-[10px] font-mono uppercase px-2 py-1 rounded border transition-colors whitespace-nowrap ${
              activeLevels.has(lvl)
                ? `${LEVEL_STYLE[lvl]} border-transparent`
                : 'text-[var(--text-dim)] border-[var(--rail-light)] bg-transparent hover:text-[var(--text-muted)]'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search logs…"
          className="flex-1 sm:flex-initial w-full sm:w-36 text-xs px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--rail)] text-[var(--text-muted)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button onClick={onCopyAll} title="Copy all" className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors">
          <HugeiconsIcon icon={Copy01Icon} size={14} />
        </button>
        <button onClick={onDownloadLogs} title="Download" className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:bg-[var(--hover)] transition-colors">
          <HugeiconsIcon icon={Download01Icon} size={14} />
        </button>
        <button
          onClick={onAutoScrollToggle}
          title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          className={`p-1.5 rounded-lg transition-colors ${autoScroll ? 'text-[var(--accent)]' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'}`}
        >
          <HugeiconsIcon icon={RefreshIcon} size={14} className={autoScroll ? 'animate-spin-slow' : ''} />
        </button>
      </div>
    </div>
  );
}
