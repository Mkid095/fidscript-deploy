'use client';

/**
 * LiveEventRow — a single row in the LiveFeed scroll list.
 *
 * Renders the timestamp, category badge, summary, full event-type label, and a
 * collapsible JSON payload. Pure presentation — no SDK calls, no state beyond
 * the controlled `expanded` value.
 */
import { HugeiconsIcon } from '@hugeicons/react';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';

import { liveCategoryOf, summarizeLiveEvent, type LiveEvent } from './live-feed-utils';

interface LiveEventRowProps {
  ev: LiveEvent;
  expanded: boolean;
  onToggle: () => void;
}

export function LiveEventRow({ ev, expanded, onToggle }: LiveEventRowProps) {
  const { cat } = liveCategoryOf(ev.type);
  return (
    <li>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-2 hover:bg-[var(--rail)]/30 text-left transition-colors"
      >
        <span className="text-[11px] text-[var(--text-dim)] mt-0.5 w-16 flex-shrink-0">
          {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
        </span>
        <span className={`flex-shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-sans font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border ${cat.cls}`}>
          <HugeiconsIcon icon={cat.icon} size={11} />
          {cat.label}
        </span>
        <span className="text-xs text-[var(--text)] flex-1 min-w-0 truncate">{summarizeLiveEvent(ev)}</span>
        <span className="text-[10px] text-[var(--text-dim)] flex-shrink-0 mt-0.5 hidden sm:block">{ev.type}</span>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={12}
          className={`flex-shrink-0 mt-1 text-[var(--text-dim)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <pre className="mx-4 mb-2 px-3 py-2 rounded-md bg-[#0a0c12] border border-[var(--rail)] text-[11px] leading-relaxed text-[var(--text-muted)] overflow-x-auto">
{JSON.stringify({ type: ev.type, timestamp: ev.timestamp, data: ev.data ?? {} }, null, 2)}
        </pre>
      )}
    </li>
  );
}
