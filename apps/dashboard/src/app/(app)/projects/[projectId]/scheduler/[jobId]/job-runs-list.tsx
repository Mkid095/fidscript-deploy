'use client';

import { useState } from 'react';
import { Button, Card, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Refresh01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import type { CronJobRun } from '@/types';
import { RunTimeline } from './run-timeline';

function statusColor(status: CronJobRun['status']): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'completed': return { bg: 'bg-[var(--success)]/10', text: 'text-[var(--success)]', border: 'border-[var(--success)]/20', dot: 'bg-[var(--success)]' };
    case 'failed':    return { bg: 'bg-[var(--danger)]/10',  text: 'text-[var(--danger)]',  border: 'border-[var(--danger)]/20',  dot: 'bg-[var(--danger)]' };
    case 'skipped':   return { bg: 'bg-[var(--warning)]/10',text: 'text-[var(--warning)]', border: 'border-[var(--warning)]/20',dot: 'bg-[var(--warning)]' };
    default:          return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' };
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${((ms % 60_000) / 1000).toFixed(0)}s`;
}

interface Props {
  runs: CronJobRun[];
  recentRuns: CronJobRun[];
  hasMoreRuns: boolean;
  onLoadMore: () => void;
  onSelectRun: (run: CronJobRun) => void;
}

export function JobRunsList({ runs, recentRuns, hasMoreRuns, onLoadMore, onSelectRun }: Props) {
  const statusIcon = (status: CronJobRun['status']) => {
    switch (status) {
      case 'completed': return { icon: 'CheckmarkCircle02Icon', cls: 'text-[var(--success)]' };
      case 'failed':    return { icon: 'Cancel01Icon', cls: 'text-[var(--danger)]' };
      case 'skipped':   return { icon: 'AlertCircleIcon', cls: 'text-[var(--warning)]' };
      default:          return { icon: 'AlarmClockIcon', cls: 'text-[var(--accent)]' };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Execution history</h2>
        {runs.length > 0 && (
          <span className="text-xs text-[var(--text-muted)]">{runs.length} runs recorded</span>
        )}
      </div>

      {runs.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No runs yet"
            description="Trigger the job manually or wait for the next scheduled run."
          />
        </Card>
      ) : (
        <>
          <RunTimeline runs={runs} />
          <div className="space-y-2">
            {recentRuns.map(run => {
              const { bg, text, border } = statusColor(run.status);
              const si = statusIcon(run.status);
              return (
                <button
                  key={run.id}
                  onClick={() => onSelectRun(run)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border} transition-colors cursor-pointer text-left hover:brightness-110`}
                >
                  <HugeiconsIcon icon={AlertCircleIcon} size={16} className={si.cls + ' flex-shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-medium ${text}`}>{run.status}</span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">{run.id.slice(0, 12)}…</span>
                      {run.attempt > 1 && (
                        <span className="text-[10px] text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded">
                          attempt {run.attempt}
                        </span>
                      )}
                    </div>
                    {run.errorMessage && (
                      <p className="text-[10px] text-[var(--danger)] mt-0.5 truncate" title={run.errorMessage}>
                        {run.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-[var(--text-dim)]">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                    {run.durationMs != null && (
                      <span className="text-xs text-[var(--text-dim)] font-mono tabular-nums">
                        {formatDuration(run.durationMs)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {hasMoreRuns && (
              <button
                onClick={onLoadMore}
                className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-1"
              >
                <HugeiconsIcon icon={Refresh01Icon} size={12} />
                Load more ({runs.length - recentRuns.length} remaining)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
