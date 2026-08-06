import type { FidscriptSDK } from '@fidscript-deploy/sdk';
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CronJob, CronJobRun, Function_, Queue } from '@/types';
import { detectActionType, persistJobUpdate } from './job-edit-save';
import { EMPTY_EDIT_FORM } from './job-edit-types';
import type { JobEditForm } from './job-edit-types';

interface UseJobDetailOptions {
  projectId: string;
  jobId: string;
  getSdk: () => FidscriptSDK;
}

export function useJobDetail({ projectId, jobId, getSdk }: UseJobDetailOptions) {
  const [job, setJob] = useState<CronJob | null>(null);
  const [runs, setRuns] = useState<CronJobRun[]>([]);
  const [simulatedRuns, setSimulatedRuns] = useState<{ scheduledAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [runsPage, setRunsPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState<CronJobRun | null>(null);
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const RUNS_PER_PAGE = 20;

  const [form, setForm] = useState<JobEditForm>(EMPTY_EDIT_FORM);

  const load = useCallback(async () => {
    if (!projectId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [jobData, runsData, simData, fnData, qData] = await Promise.all([
        sdk.cron.get(projectId, jobId),
        sdk.cron.getRuns(projectId, jobId, 100),
        sdk.cron.simulate(projectId, jobId, 5),
        sdk.functions.list(projectId).catch(() => [] as Function_[]),
        sdk.queues.list(projectId).catch(() => [] as Queue[]),
      ]);
      setJob(jobData);
      setRuns(runsData);
      setSimulatedRuns(simData);
      setFunctions(fnData as Function_[]);
      setQueues(qData as Queue[]);
      populateForm(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [projectId, jobId, getSdk]);

  useEffect(() => { load(); }, [load]);

  function populateForm(j: CronJob) {
    setForm({
      ...EMPTY_EDIT_FORM,
      name: j.name,
      expression: j.cronExpression,
      timezone: j.timezone ?? 'UTC',
      actionType: detectActionType(j),
      endpoint: j.endpoint ?? '',
      functionId: j.functionId ?? '',
      emailFrom: j.emailConfig?.from ?? '',
      emailTo: j.emailConfig?.to ?? '',
      emailSubject: j.emailConfig?.subject ?? '',
      emailBody: j.emailConfig?.text ?? j.emailConfig?.html ?? '',
      queueId: j.queueConfig?.queueId ?? '',
      queueBody: j.queueConfig?.body != null ? JSON.stringify(j.queueConfig.body, null, 2) : '',
      queueDelaySeconds: j.queueConfig?.delaySeconds ?? 0,
      payload: JSON.stringify(j.payload ?? {}, null, 2),
      retryAttempts: j.retryAttempts ?? 3,
      retryDelay: j.retryDelaySeconds ?? 60,
      timeout: j.timeoutSeconds ?? 300,
    });
  }

  const handleTrigger = useCallback(async () => {
    if (!projectId || !jobId) return;
    setTriggering(true);
    try {
      const sdk = getSdk();
      await sdk.cron.trigger(projectId, jobId);
      const runsData = await sdk.cron.getRuns(projectId, jobId, 100);
      setRuns(runsData);
    } finally {
      setTriggering(false);
    }
  }, [projectId, jobId, getSdk]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !jobId || !form.name.trim() || !form.expression.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sdk = getSdk();
      const updated = await persistJobUpdate(sdk, projectId, jobId, form);
      setJob(updated);
      setShowEdit(false);
      const simData = await sdk.cron.simulate(projectId, jobId, 5);
      setSimulatedRuns(simData);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }, [projectId, jobId, getSdk, form]);

  const recentRuns = runs.slice(0, runsPage * RUNS_PER_PAGE);
  const hasMoreRuns = runs.length > recentRuns.length;
  const successRate = runs.length > 0
    ? Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100)
    : null;

  return {
    job, runs, simulatedRuns, loading, error,
    triggering, showEdit, setShowEdit,
    saving, saveError,
    selectedRun, setSelectedRun,
    runsPage, setRunsPage, hasMoreRuns, recentRuns, successRate,
    form, setForm,
    functions, queues,
    handleTrigger, handleSave,
    populateForm,
  };
}