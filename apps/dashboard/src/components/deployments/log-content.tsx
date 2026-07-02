'use client';

import { Spinner } from '@fidscript/ui';
import { LEVEL_STYLE, LogLine } from './log-types';

interface LogContentProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  filtered: LogLine[];
  inFlight: boolean;
  onScroll: () => void;
  isStreaming?: boolean;
}

export function LogContent({ containerRef, filtered, inFlight, onScroll, isStreaming = false }: LogContentProps) {
  return (
    <div
      ref={containerRef}
      className="bg-[var(--surface-2)] overflow-y-auto relative"
      style={{ maxHeight: 'min(50vh, 400px)' }}
      onScroll={onScroll}
    >
      {filtered.length === 0 ? (
        <div className="p-6 flex items-center justify-center gap-2 text-xs text-[var(--text-dim)]">
          {inFlight ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Waiting for build output…</span>
              {isStreaming && <span className="text-[var(--accent)]">(receiving live logs)</span>}
            </div>
          ) : 'No log entries match your filters.'}
        </div>
      ) : (
        <div className="divide-y divide-[var(--rail)]/40">
          {filtered.map(line => (
            <LogLineItem key={line.id} line={line} />
          ))}
          
          {/* Streaming indicator at bottom */}
          {isStreaming && inFlight && (
            <div className="sticky bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-[var(--surface-2)] to-transparent">
              <div className="flex items-center gap-2 text-[10px] text-[var(--accent)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Receiving live logs…
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogLineItem({ line }: { line: LogLine }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 px-4 py-1.5 hover:bg-[var(--rail)]/20 transition-colors group">
      <div className="flex items-center gap-2 flex-shrink-0">
        {line.ts && (
          <span className="text-[10px] font-mono text-[var(--text-dim)] sm:w-28">
            {new Date(line.ts).toLocaleTimeString()}
          </span>
        )}
        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${LEVEL_STYLE[line.level]}`}>
          {line.level}
        </span>
      </div>
      <span className="text-xs font-mono text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap break-all group-hover:text-[var(--text)] transition-colors">
        {line.text}
      </span>
    </div>
  );
}
