'use client';

/**
 * LiveFeedConnectionStatus — animated ping dot + status label.
 *
 * Pure presentation: takes the socket status, renders the animated connected dot
 * and the appropriate label. No state, no SDK calls.
 */
import { HugeiconsIcon } from '@hugeicons/react';
import { PauseIcon, PlayCircleIcon, Delete01Icon } from '@hugeicons/core-free-icons';
import { type LiveFeedStatus } from './live-feed-utils';

const STATUS_META: Record<LiveFeedStatus, { label: string; dot: string; text: string; ring: string }> = {
  connected:    { label: 'Live',         dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' },
  connecting:   { label: 'Connecting',   dot: 'bg-amber-400',   text: 'text-amber-300',   ring: '' },
  disconnected: { label: 'Disconnected', dot: 'bg-rose-400',    text: 'text-rose-300',    ring: '' },
};

interface LiveFeedConnectionStatusProps {
  status: LiveFeedStatus;
  eventCount: number;
  paused: boolean;
  onTogglePaused: () => void;
  onClear: () => void;
}

export function LiveFeedConnectionStatus({
  status, eventCount, paused, onTogglePaused, onClear,
}: LiveFeedConnectionStatusProps) {
  const sm = STATUS_META[status];
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--rail)] flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          {status === 'connected' && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sm.dot} ${status === 'connected' ? sm.ring : ''}`} />
        </span>
        <h2 className="text-sm font-semibold text-[var(--text)]">Live event stream</h2>
        <span className={`text-[11px] font-medium ${sm.text}`}>{sm.label}</span>
        <span className="text-[11px] text-[var(--text-dim)]">{eventCount} this session</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePaused}
          title={paused ? 'Resume stream' : 'Pause stream'}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
            paused
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
          }`}
        >
          <HugeiconsIcon icon={paused ? PlayCircleIcon : PauseIcon} size={13} />
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onClear}
          title="Clear"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
        >
          <HugeiconsIcon icon={Delete01Icon} size={13} />
        </button>
      </div>
    </div>
  );
}
