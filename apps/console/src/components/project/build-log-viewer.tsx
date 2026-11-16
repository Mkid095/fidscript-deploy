'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * A build log, read the way it is lived.
 *
 * While the build runs it follows the tail, so what is on screen is what the
 * build is saying now. When it fails, the window opens on the tail — where
 * the failure is — and every error line is marked, with the first one in
 * view scrolled to. When it succeeds, the noise collapses to a summary and
 * the last few lines; the whole log is one press away, and one press copies
 * it.
 *
 * Long logs are truncated from the TOP: the end is where the build is, and
 * where it ended — the beginning is rarely the thing anyone needs.
 */

const ACTIVE_WINDOW = 400;
const SUCCESS_WINDOW = 24;

const ACTIVE_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);

function isErrorLine(line: string): boolean {
  return (
    /^\[error\]/i.test(line) ||
    /\bERR!\b/.test(line) ||
    /\bFATAL\b/.test(line) ||
    /\berror:\s/i.test(line) ||
    /\bcommand failed\b/i.test(line)
  );
}

export function BuildLogViewer({
  logs,
  status,
  durationMs,
}: {
  logs: string;
  status: string;
  /** How long the build took, when it is over. */
  durationMs?: number | null;
}) {
  const allLines = useMemo(() => (logs ? logs.split('\n') : []), [logs]);
  const upper = status.toUpperCase();
  const active = ACTIVE_STATUSES.has(upper);
  const failed = upper === 'FAILED';
  const succeeded = upper === 'SUCCESS';

  const [showAll, setShowAll] = useState(false);
  const [follow, setFollow] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // The window: what the log is doing decides what is worth showing.
  const windowSize =
    failed || active
      ? ACTIVE_WINDOW
      : succeeded
        ? SUCCESS_WINDOW
        : ACTIVE_WINDOW;
  const hiddenCount =
    showAll || allLines.length <= windowSize ? 0 : allLines.length - windowSize;
  const visibleLines = hiddenCount > 0 ? allLines.slice(hiddenCount) : allLines;

  useEffect(() => {
    if (active && follow) bottom.current?.scrollIntoView({ block: 'end' });
    if (failed) {
      // Open on the tail — the failure is where the build stopped.
      bottom.current?.scrollIntoView({ block: 'end' });
    }
  }, [visibleLines.length, active, follow, failed]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the clipboard is not available — nothing to do */
    }
  };

  const seconds =
    durationMs != null && durationMs > 0
      ? `${Math.round(durationMs / 100) / 10}s`
      : null;

  return (
    <div className="overflow-hidden rounded-xl border border-rail bg-well">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rail bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Terminal className="size-3.5 text-accent" aria-hidden />
          <span className="font-mono text-text-dim">runner.stdout</span>
          <span className="text-text-dim">·</span>
          {active ? (
            <span className="flex items-center gap-1.5 font-mono text-warning">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-warning" />
              building
            </span>
          ) : failed ? (
            <span className="font-mono text-danger">failed</span>
          ) : succeeded ? (
            <span className="font-mono text-success">
              built{seconds ? ` in ${seconds}` : ''}
            </span>
          ) : (
            <span className="font-mono text-text-dim">
              {status.toLowerCase()}
            </span>
          )}
          <span className="font-mono text-text-dim">
            · {allLines.length} lines
          </span>
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-accent-soft transition-colors hover:underline"
            >
              {hiddenCount} earlier lines hidden — show all
            </button>
          ) : showAll && allLines.length > windowSize ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-text-dim transition-colors hover:text-text"
            >
              show the tail only
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {active ? (
            <button
              type="button"
              onClick={() => setFollow(!follow)}
              className="text-[11px] text-text-dim transition-colors hover:text-text"
            >
              {follow ? 'following' : 'follow'}
            </button>
          ) : null}
          {allLines.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy logs'}
            </Button>
          ) : null}
        </div>
      </div>

      {allLines.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-text-dim">
          {active
            ? 'The build log appears here as the build speaks.'
            : 'There is no build log for this deployment.'}
        </div>
      ) : (
        <div className="scroll-area max-h-96 overflow-y-auto px-3 py-2">
          <pre className="font-mono text-xs leading-relaxed">
            {visibleLines.map((line, index) => {
              const realIndex = index + hiddenCount;
              const error = isErrorLine(line);
              return (
                <div
                  key={realIndex}
                  className={`flex gap-3 ${error ? 'rounded bg-danger/10 px-1 text-danger' : 'text-text-muted'}`}
                >
                  <span className="w-10 shrink-0 select-none text-right text-text-dim/60">
                    {realIndex + 1}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-words">
                    {line || ' '}
                  </span>
                </div>
              );
            })}
          </pre>
          <div ref={bottom} />
        </div>
      )}
    </div>
  );
}
