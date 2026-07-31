'use client';

import { Button } from '@fidscript/ui';
import type { CronJob } from '@/types';

interface Props {
  job: CronJob;
  projectId: string;
  triggering: boolean;
  onBack: () => void;
  onEdit: () => void;
  onTrigger: () => void;
}

export function JobDetailHeader({ job, projectId, triggering, onBack, onEdit, onTrigger }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="min-w-0">
        <button
          onClick={onBack}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1 mb-2"
        >
          ← Scheduler
        </button>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-[var(--text)] truncate">{job.name}</h1>
          <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            job.enabled
              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
              : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
          }`}>
            {job.enabled ? 'Active' : 'Paused'}
          </span>
        </div>
        <p className="text-xs text-[var(--text-dim)] font-mono">
          {job.cronExpression} · {job.timezone ?? 'UTC'} · {job.retryAttempts} retries
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="primary" size="sm" onClick={onTrigger} loading={triggering} disabled={!job.enabled}>
          Run now
        </Button>
      </div>
    </div>
  );
}
