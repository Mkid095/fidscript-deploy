'use client';

import { useCallback } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { CronJob } from '@/types';
import type { JobFormSubmitData } from './job-form-modal';

export function useSchedulerActions(
  sdk: FidscriptSDK,
  projectId: string,
  setJobs: (jobs: CronJob[] | ((prev: CronJob[]) => CronJob[])) => void,
) {
  const handleCreate = useCallback(async (data: JobFormSubmitData) => {
    if (!projectId) return;
    await sdk.cron.create(projectId, data);
    const updated = await sdk.cron.list(projectId);
    setJobs(updated);
  }, [sdk, projectId, setJobs]);

  const handleToggle = useCallback(async (job: CronJob) => {
    if (!projectId) return;
    await sdk.cron.update(projectId, job.id, { enabled: !job.enabled });
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !job.enabled } : j));
  }, [sdk, projectId, setJobs]);

  const handleTrigger = useCallback(async (jobId: string) => {
    if (!projectId) return;
    await sdk.cron.trigger(projectId, jobId);
  }, [sdk, projectId]);

  const handleDelete = useCallback(async (jobId: string) => {
    if (!projectId) return;
    await sdk.cron.delete(projectId, jobId);
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, [sdk, projectId, setJobs]);

  return { handleCreate, handleToggle, handleTrigger, handleDelete };
}