'use client';

import { Card, EmptyState, Spinner, Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlarmClockIcon } from '@hugeicons/core-free-icons';
import type { CronJob } from '@/types';
import { JobCard } from './job-card';

interface JobListContentProps {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string;
  togglingId: string | null;
  deletingId: string | null;
  jobStats: Record<string, {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }>;
  onToggle: (job: CronJob) => void;
  onTrigger: (job: CronJob) => void;
  onDelete: (job: CronJob) => void;
  onNewJob: () => void;
}

export function JobListContent({
  jobs,
  loading,
  error,
  selectedProjectId,
  togglingId,
  deletingId,
  jobStats,
  onToggle,
  onTrigger,
  onDelete,
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
          onDelete={() => onDelete(job)}
          toggling={togglingId === job.id}
          deleting={deletingId === job.id}
          stats={jobStats[job.id]}
        />
      ))}
    </div>
  );
}
