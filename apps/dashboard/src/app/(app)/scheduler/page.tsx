'use client';

import { useState } from 'react';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import type { CronJob } from '@/types';
import { useSchedulerData } from './use-scheduler-data';
import { useSchedulerActions } from './use-scheduler-actions';
import { JobListHeader } from './job-list-header';
import { JobListContent } from './job-list-content';
import { JobFormModal, type JobFormSubmitData } from './job-form-modal';
import { EMPTY_JOB_FORM, type JobForm } from './job-form-types';

const EMPTY_FORM: JobForm = EMPTY_JOB_FORM;

export default function SchedulerPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const sdk = getSdk();

  const initialProjectId = shellProjectId ?? '';

  const {
    projects, pickedProjectId, setPickedProjectId, effectiveProjectId,
    jobs, setJobs, jobStats, loadingProjects, loadingJobs, error,
  } = useSchedulerData(sdk, initialProjectId, shellProjectId);

  const { handleCreate: sdkCreate, handleToggle: sdkToggle, handleTrigger: sdkTrigger, handleDelete: sdkDelete } =
    useSchedulerActions(sdk, effectiveProjectId, setJobs);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);

  async function handleCreate(data: JobFormSubmitData) {
    if (!effectiveProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      await sdkCreate(data);
      setForm(EMPTY_FORM);
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
      await sdkToggle(job);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleTrigger(job: CronJob) {
    if (!effectiveProjectId) return;
    setTriggerError(null);
    try {
      await sdkTrigger(job.id);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Failed to trigger job');
    }
  }

  async function handleDelete(job: CronJob) {
    if (!effectiveProjectId) return;
    if (!confirm(`Delete cron job "${job.name}"? This cannot be undone.`)) return;
    setDeletingId(job.id);
    try {
      await sdkDelete(job.id);
    } finally {
      setDeletingId(null);
    }
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

      {triggerError && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-6 text-sm text-[var(--danger)]">
          {triggerError}
        </div>
      )}

      <JobListContent
        jobs={jobs}
        loading={loadingJobs}
        error={error}
        selectedProjectId={effectiveProjectId}
        togglingId={togglingId}
        deletingId={deletingId}
        jobStats={jobStats}
        onToggle={handleToggle}
        onTrigger={handleTrigger}
        onDelete={handleDelete}
        onNewJob={() => setShowCreate(true)}
      />

      <JobFormModal
        isOpen={showCreate}
        sdk={sdk}
        projectId={effectiveProjectId}
        onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
        onSubmit={handleCreate}
        loading={creating}
        error={createError}
        form={form}
        onFieldChange={fields => setForm(prev => ({ ...prev, ...fields }))}
      />
    </div>
  );
}