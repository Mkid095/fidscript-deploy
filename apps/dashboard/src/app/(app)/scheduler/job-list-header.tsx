'use client';

import { Button } from '@fidscript/ui';
import type { Project, CronJob } from '@/types';

interface JobListHeaderProps {
  projects: Project[];
  pickedProjectId: string;
  onProjectChange: (id: string) => void;
  hasShellProjectId: boolean;
  jobs: CronJob[];
  loadingJobs: boolean;
  onNewJob: () => void;
}

export function JobListHeader({
  projects,
  pickedProjectId,
  onProjectChange,
  hasShellProjectId,
  jobs,
  loadingJobs,
  onNewJob,
}: JobListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-1">Scheduler</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {loadingJobs ? 'Loading…' : `${jobs.length} cron job${jobs.length !== 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {!hasShellProjectId && projects.length > 0 && (
          <select
            value={pickedProjectId}
            onChange={e => onProjectChange(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <Button variant="primary" size="sm" onClick={onNewJob}>
          New Job
        </Button>
      </div>
    </div>
  );
}
