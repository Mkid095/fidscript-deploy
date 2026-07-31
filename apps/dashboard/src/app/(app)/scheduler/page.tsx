'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { Project, CronJob } from '@/types';
import { JobListHeader } from './job-list-header';
import { JobListContent } from './job-list-content';
import { JobFormModal } from './job-form-modal';

export default function SchedulerPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [jobStats, setJobStats] = useState<Record<string, {
    total: number; completed: number; failed: number;
    successRate: number | null; avgDurationMs: number | null;
    sparkline: { status: string; durationMs: number | null }[];
  }>>({});
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    expression: '',
    timezone: 'UTC',
    targetType: 'endpoint' as 'endpoint' | 'function',
    endpoint: '',
    functionId: '',
    payload: '{}',
    retryAttempts: 3,
    retryDelay: 60,
    timeout: 300,
  });

  useEffect(() => {
    if (shellProjectId) return;
    async function loadProjects() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0) setPickedProjectId((data.projects ?? [])[0].id);
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    loadProjects();
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadJobs() {
      setLoadingJobs(true);
      setError(null);
      try {
        const sdk = getSdk();
        const data = await sdk.cron.list(selectedProjectId);
        setJobs(data);
        const statsResults = await Promise.all(
          data.map(j => sdk.cron.stats(selectedProjectId, j.id).catch(() => null)),
        );
        const statsMap: typeof jobStats = {};
        data.forEach((j, i) => { if (statsResults[i]) statsMap[j.id] = statsResults[i]; });
        setJobStats(statsMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cron jobs');
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, [selectedProjectId, getSdk]);

  async function handleCreate(data: Parameters<typeof handleCreate>[0]) {
    if (!selectedProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const sdk = getSdk();
      await sdk.cron.create(selectedProjectId, {
        name: data.name,
        cronExpression: data.cronExpression,
        timezone: data.timezone,
        payload: data.payload,
        retryAttempts: data.retryAttempts,
        retryDelaySeconds: data.retryDelaySeconds,
        timeoutSeconds: data.timeoutSeconds,
        endpoint: data.endpoint,
        functionId: data.functionId,
      });
      const updated = await sdk.cron.list(selectedProjectId);
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
    if (!selectedProjectId) return;
    setTogglingId(job.id);
    try {
      const sdk = getSdk();
      await sdk.cron.update(selectedProjectId, job.id, { enabled: !job.enabled });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTrigger(job: CronJob) {
    if (!selectedProjectId) return;
    try {
      const sdk = getSdk();
      await sdk.cron.trigger(selectedProjectId, job.id);
    } catch { /* fire and forget */ }
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
        selectedProjectId={selectedProjectId}
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
