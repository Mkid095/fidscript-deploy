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

function jobTarget(job: CronJob): string {
  if (job.actionType === 'function' && job.functionId) return `fn:${job.functionId}`;
  if (job.actionType === 'http' && job.endpoint) return job.endpoint;
  if (job.actionType === 'email' && job.emailConfig?.to) return `to: ${job.emailConfig.to}`;
  if (job.actionType === 'queue' && job.queueConfig?.queueId) return `queue:${job.queueConfig.queueId}`;
  if (job.functionId) return `fn:${job.functionId}`;
  if (job.endpoint) return job.endpoint;
  return '—';
}

const ACTION_LABELS: Record<string, string> = {
  http: 'HTTP',
  function: 'Function',
  email: 'Email',
  queue: 'Queue',
};

const STATE_LABELS: Record<string, string> = {
  idling: 'Idle',
  scheduled: 'Scheduled',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
  dead: 'Dead',
};

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
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-[var(--text)] truncate">{job.name}</h1>
          <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            job.enabled
              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
              : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
          }`}>
            {job.enabled ? 'Active' : 'Paused'}
          </span>
          {job.actionType && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 font-medium">
              {ACTION_LABELS[job.actionType] ?? job.actionType}
            </span>
          )}
          {job.state && job.state !== 'idling' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
              job.state === 'running' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
              : job.state === 'completed' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
              : job.state === 'failed' ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20'
              : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
            }`}>
              {STATE_LABELS[job.state] ?? job.state}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-dim)] font-mono truncate mb-0.5" title={jobTarget(job)}>
          {job.cronExpression} · {job.timezone ?? 'UTC'}
        </p>
        <p className="text-[10px] text-[var(--text-dim)] font-mono truncate" title={jobTarget(job)}>
          {jobTarget(job)}
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
