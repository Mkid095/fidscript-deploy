'use client';

import { Button, Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon, AlertCircleIcon, AlarmClockIcon } from '@hugeicons/core-free-icons';
import type { CronJobRun } from '@/types';

function statusColor(status: CronJobRun['status']): { bg: string; text: string; border: string; icon: typeof CheckmarkCircle02Icon } {
  switch (status) {
    case 'completed': return { bg: 'bg-[var(--success)]/10', text: 'text-[var(--success)]', border: 'border-[var(--success)]/20', icon: CheckmarkCircle02Icon };
    case 'failed':    return { bg: 'bg-[var(--danger)]/10',  text: 'text-[var(--danger)]',  border: 'border-[var(--danger)]/20',  icon: Cancel01Icon };
    case 'skipped':   return { bg: 'bg-[var(--warning)]/10',text: 'text-[var(--warning)]', border: 'border-[var(--warning)]/20',icon: AlertCircleIcon };
    default:          return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', icon: AlarmClockIcon };
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${((ms % 60_000) / 1000).toFixed(0)}s`;
}

interface Props {
  run: CronJobRun;
  onClose: () => void;
}

export function RunDetailModal({ run, onClose }: Props) {
  const { bg, text, border, icon } = statusColor(run.status);
  const startedAt = new Date(run.startedAt);
  const completedAt = run.completedAt ? new Date(run.completedAt) : null;

  return (
    <Modal isOpen onClose={onClose} title="Execution detail" size="md">
      <div className="space-y-4">
        {/* Status banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg} ${border}`}>
          <HugeiconsIcon icon={icon} size={20} className={text} />
          <div>
            <p className={`text-sm font-semibold ${text} capitalize`}>{run.status}</p>
            {run.statusReason && <p className="text-xs text-[var(--text-muted)] mt-0.5">{run.statusReason}</p>}
          </div>
          {run.attempt > 1 && (
            <span className="ml-auto text-[10px] bg-[var(--rail)] text-[var(--text-dim)] px-2 py-1 rounded">
              attempt {run.attempt}
            </span>
          )}
        </div>

        {/* Timestamps & duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">Started</p>
            <p className="text-xs text-[var(--text)] font-mono">{startedAt.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-1">Duration</p>
            <p className="text-xs text-[var(--text)] font-mono">
              {run.durationMs != null ? formatDuration(run.durationMs) : '—'}
            </p>
            {completedAt && (
              <p className="text-[10px] text-[var(--text-dim)] font-mono mt-0.5">
                finished {completedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        {run.errorMessage && (
          <div className="bg-[var(--danger)]/5 border border-[var(--danger)]/20 rounded-lg px-3 py-2">
            <p className="text-[10px] text-[var(--danger)] uppercase tracking-wider font-medium mb-1">Error</p>
            <pre className="text-xs text-[var(--danger)] whitespace-pre-wrap font-mono leading-relaxed">
              {run.errorMessage}
            </pre>
          </div>
        )}

        {/* Raw JSON */}
        <details className="group">
          <summary className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:block">▼</span>
            Raw record
          </summary>
          <pre className="mt-2 text-[10px] text-[var(--text-dim)] font-mono bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 overflow-auto max-h-48">
            {JSON.stringify(run, null, 2)}
          </pre>
        </details>

        {/* Run ID */}
        <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2">
          <div>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Run ID</p>
            <p className="text-xs text-[var(--text)] font-mono mt-0.5">{run.id}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(run.id)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Copy
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--rail)]">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
