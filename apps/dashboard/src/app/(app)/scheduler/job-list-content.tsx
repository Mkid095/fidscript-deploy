'use client';

import { useRouter } from 'next/navigation';
import { Card, EmptyState, Spinner, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlarmClockIcon, ArrowRight01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import type { CronJob } from '@/types';
import { Sparkline } from './job-stats';

interface JobListContentProps {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string;
  togglingId: string | null;
  jobStats: Record<string, {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }>;
  onToggle: (job: CronJob) => void;
  onTrigger: (job: CronJob) => void;
  onNewJob: () => void;
}

function formatNextRun(ts: string | undefined | null): string {
  if (!ts) return 'Not scheduled';
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = d.getTime() - now;
    if (diff < 0) return 'Overdue';
    if (diff < 60_000) return 'Less than a minute';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatRelative(ts: string | undefined | null): string {
  if (!ts) return 'Never';
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch { return '—'; }
}

interface JobCardProps {
  job: CronJob;
  selectedProjectId: string;
  toggling: boolean;
  stats?: {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  };
  onToggle: () => void;
  onTrigger: () => void;
}

function JobCard({ job, selectedProjectId, toggling, stats, onToggle, onTrigger }: JobCardProps) {
  const router = useRouter();

  return (
    <div className="group rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/40 transition-all duration-150 overflow-hidden">
      <button
        onClick={() => router.push(`/projects/${selectedProjectId}/scheduler/${job.id}`)}
        className="w-full text-left p-4 pb-3"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-[var(--text)] truncate">{job.name}</h3>
            </div>
            <p className="font-mono text-[10px] text-[var(--text-dim)] bg-[var(--rail)] px-1.5 py-0.5 rounded w-fit">
              {job.cronExpression}
            </p>
          </div>
          <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            job.enabled
              ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
              : 'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
          }`}>
            {job.enabled ? 'Active' : 'Paused'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Next run</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{formatNextRun(job.nextRunAt)}</p>
          </div>
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Last run</p>
            <p className="text-xs text-[var(--text-muted)]">{formatRelative(job.lastRunAt)}</p>
          </div>
          <div className="bg-[var(--rail)]/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mb-0.5">Success</p>
            <p className={`text-xs font-medium ${
              stats?.successRate == null ? 'text-content-dim'
              : stats.successRate >= 80 ? 'text-success'
              : stats.successRate >= 50 ? 'text-warning'
              : 'text-danger'
            }`}>
              {stats?.successRate != null ? `${stats.successRate}%` : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          {stats && stats.sparkline.length > 0 && (
            <Sparkline sparkline={stats.sparkline} />
          )}
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={job.targetType === 'function' ? ArrowRight01Icon : AlertCircleIcon}
              size={11}
              className="text-[var(--text-dim)] flex-shrink-0"
            />
            <p className="text-[10px] text-[var(--text-dim)] truncate font-mono">
              {job.targetType === 'function'
                ? `fn:${job.functionId}`
                : (job.endpoint ?? '—')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[var(--text-dim)]">
            {job.retryAttempts}× retry · {job.retryDelaySeconds}s delay · {job.timeoutSeconds}s timeout
          </span>
        </div>
      </button>

      <div className="flex items-center border-t border-[var(--rail)] px-3 py-2 gap-1">
        <button
          onClick={e => { e.stopPropagation(); onTrigger(); }}
          className="flex-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] py-1 text-center transition-colors"
          title="Run now"
        >
          Run now
        </button>
        <div className="w-px h-3 bg-[var(--rail)]" />
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          disabled={toggling}
          className={`flex-1 text-[10px] py-1 text-center transition-colors disabled:opacity-50 ${
            job.enabled
              ? 'text-[var(--warning)] hover:text-[var(--warning)]/80'
              : 'text-[var(--success)] hover:text-[var(--success)]/80'
          }`}
        >
          {toggling ? '…' : job.enabled ? 'Pause' : 'Enable'}
        </button>
        <div className="w-px h-3 bg-[var(--rail)]" />
        <button
          onClick={e => { e.stopPropagation(); router.push(`/projects/${selectedProjectId}/scheduler/${job.id}`); }}
          className="flex-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] py-1 text-center transition-colors"
        >
          Details →
        </button>
      </div>
    </div>
  );
}

export function JobListContent({
  jobs,
  loading,
  error,
  selectedProjectId,
  togglingId,
  jobStats,
  onToggle,
  onTrigger,
  onNewJob,
}: JobListContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-6 text-sm text-[var(--danger)]">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border border-[var(--rail)]">
        <EmptyState
          icon={<HugeiconsIcon icon={AlarmClockIcon} size={48} className="text-[var(--text-dim)]" />}
          title="No cron jobs yet"
          description="Schedule recurring tasks with cron expressions. Trigger HTTP endpoints or invoke functions on a schedule."
          action={
            <Button variant="primary" size="sm" onClick={onNewJob}>
              Create your first job
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          selectedProjectId={selectedProjectId}
          onToggle={() => onToggle(job)}
          onTrigger={() => onTrigger(job)}
          toggling={togglingId === job.id}
          stats={jobStats[job.id]}
        />
      ))}
    </div>
  );
}
