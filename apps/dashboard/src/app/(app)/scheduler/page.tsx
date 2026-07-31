'use client';

import { useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { CronJob } from '@/types';
import { useSchedulerData } from './use-scheduler-data';
import { JobListHeader } from './job-list-header';
import { JobListContent } from './job-list-content';
import { JobFormModal } from './job-form-modal';

export default function SchedulerPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const sdk = getSdk();

  const {
    projects, pickedProjectId, setPickedProjectId, effectiveProjectId,
    jobs, jobStats, loadingProjects, loadingJobs, error,
  } = useSchedulerData(sdk, effectiveProjectId ?? '', shellProjectId);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', expression: '', timezone: 'UTC',
    targetType: 'endpoint' as 'endpoint' | 'function',
    endpoint: '', functionId: '', payload: '{}',
    retryAttempts: 3, retryDelay: 60, timeout: 300,
  });

  async function handleCreate(data: {
    name: string; cronExpression: string; timezone: string;
    payload: Record<string, unknown>; retryAttempts: number;
    retryDelaySeconds: number; timeoutSeconds: number;
    endpoint?: string; functionId?: string;
  }) {
    if (!effectiveProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      await sdk.cron.create(effectiveProjectId, data);
      const updated = await sdk.cron.list(effectiveProjectId);
      setJobs(updated);
      setForm({ name: '', expression: '', timezone: 'UTC', targetType: 'endpoint', endpoint: '', functionId: '', payload: '{}', retryAttempts: 3, retryDelay: 60, timeout: 300 });
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(job: CronJob) {
    if (!effectiveProjectId) return;
    setTogglingId(job.id);
    try {
      await sdk.cron.update(effectiveProjectId, job.id, { enabled: !job.enabled });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTrigger(job: CronJob) {
    if (!effectiveProjectId) return;
    try { await sdk.cron.trigger(effectiveProjectId, job.id); } catch { /* fire and forget */ }
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <JobListHeader
        projects={projects}
        pickedProjectId={pickedProjectId}
        onProjectChange={setPickedProjectId}
        hasShellProjectId={!!shellProjectId}
        jobs={jobs}
        loadingJobs={loadingJobs}
        onNewJob={() => setShowCreate(true)}
      />

      <JobListContent
        jobs={jobs}
        loading={loadingJobs}
        error={error}
        selectedProjectId={effectiveProjectId}
        togglingId={togglingId}
        jobStats={jobStats}
        onToggle={handleToggle}
        onTrigger={handleTrigger}
        onNewJob={() => setShowCreate(true)}
      />

      <JobFormModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setForm({ name: '', expression: '', timezone: 'UTC', targetType: 'endpoint', endpoint: '', functionId: '', payload: '{}', retryAttempts: 3, retryDelay: 60, timeout: 300 }); }}
        onSubmit={handleCreate}
        loading={creating}
        error={createError}
        form={form}
        onFieldChange={fields => setForm(prev => ({ ...prev, ...fields }))}
      />
    </div>
  );
}
