import type { FidscriptSDK } from '@fidscript-deploy/sdk';
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CronJob, CronJobRun } from '@/types';

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
  const RUNS_PER_PAGE = 20;

  // Form state
  const [formName, setFormName] = useState('');
  const [formExpression, setFormExpression] = useState('');
  const [formTimezone, setFormTimezone] = useState('UTC');
  const [formTargetType, setFormTargetType] = useState<'endpoint' | 'function'>('endpoint');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formPayload, setFormPayload] = useState('{}');
  const [formRetryAttempts, setFormRetryAttempts] = useState(3);
  const [formRetryDelay, setFormRetryDelay] = useState(60);
  const [formTimeout, setFormTimeout] = useState(300);

  const load = useCallback(async () => {
    if (!projectId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [jobData, runsData, simData] = await Promise.all([
        sdk.cron.get(projectId, jobId),
        sdk.cron.getRuns(projectId, jobId, 100),
        sdk.cron.simulate(projectId, jobId, 5),
      ]);
      setJob(jobData);
      setRuns(runsData);
      setSimulatedRuns(simData);
      populateForm(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [projectId, jobId, getSdk]);

  useEffect(() => { load(); }, [load]);

  function populateForm(j: CronJob) {
    setFormName(j.name);
    setFormExpression(j.cronExpression);
    setFormTimezone(j.timezone ?? 'UTC');
    setFormTargetType((j.targetType as 'endpoint' | 'function') ?? 'endpoint');
    setFormEndpoint(j.endpoint ?? '');
    setFormFunctionId(j.functionId ?? '');
    setFormPayload(JSON.stringify(j.payload ?? {}, null, 2));
    setFormRetryAttempts(j.retryAttempts ?? 3);
    setFormRetryDelay(j.retryDelaySeconds ?? 60);
    setFormTimeout(j.timeoutSeconds ?? 300);
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
    if (!projectId || !jobId || !formName.trim() || !formExpression.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sdk = getSdk();
      let parsedPayload = {};
      try { parsedPayload = JSON.parse(formPayload); } catch { /* ignore */ }
      const updated = await sdk.cron.update(projectId, jobId, {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        timezone: formTimezone,
        targetType: formTargetType,
        ...(formTargetType === 'endpoint'
          ? { endpoint: formEndpoint }
          : { functionId: formFunctionId }),
        payload: parsedPayload,
        retryAttempts: formRetryAttempts,
        retryDelaySeconds: formRetryDelay,
        timeoutSeconds: formTimeout,
      } as any);
      setJob(updated);
      setShowEdit(false);
      const simData = await sdk.cron.simulate(projectId, jobId, 5);
      setSimulatedRuns(simData);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }, [projectId, jobId, getSdk, formName, formExpression, formTimezone, formTargetType, formEndpoint, formFunctionId, formPayload, formRetryAttempts, formRetryDelay, formTimeout]);

  const recentRuns = runs.slice(0, runsPage * RUNS_PER_PAGE);
  const hasMoreRuns = runs.length > recentRuns.length;

  const successRate = runs.length > 0
    ? Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100)
    : null;

  return {
    job,
    runs,
    simulatedRuns,
    loading,
    error,
    triggering,
    showEdit,
    setShowEdit,
    saving,
    saveError,
    selectedRun,
    setSelectedRun,
    runsPage,
    setRunsPage,
    hasMoreRuns,
    recentRuns,
    successRate,
    formName, setFormName,
    formExpression, setFormExpression,
    formTimezone, setFormTimezone,
    formTargetType, setFormTargetType,
    formEndpoint, setFormEndpoint,
    formFunctionId, setFormFunctionId,
    formPayload, setFormPayload,
    formRetryAttempts, setFormRetryAttempts,
    formRetryDelay, setFormRetryDelay,
    formTimeout, setFormTimeout,
    handleTrigger,
    handleSave,
    populateForm,
  };
}
