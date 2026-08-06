'use client';

import { useState, useCallback } from 'react';
import type { CronJob } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export function useJobFormState(getSdk: () => FidscriptSDK, projectId: string, jobId: string) {
  const [formName, setFormName] = useState('');
  const [formExpression, setFormExpression] = useState('');
  const [formTimezone, setFormTimezone] = useState('UTC');
  const [formTargetType, setFormTargetType] = useState<'http' | 'function'>('http');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formPayload, setFormPayload] = useState('{}');
  const [formRetryAttempts, setFormRetryAttempts] = useState(3);
  const [formRetryDelay, setFormRetryDelay] = useState(60);
  const [formTimeout, setFormTimeout] = useState(300);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function populateForm(j: CronJob) {
    setFormName(j.name);
    setFormExpression(j.cronExpression);
    setFormTimezone(j.timezone ?? 'UTC');
    setFormTargetType((j.targetType as 'http' | 'function') ?? 'http');
    setFormEndpoint(j.endpoint ?? '');
    setFormFunctionId(j.functionId ?? '');
    setFormPayload(JSON.stringify(j.payload ?? {}, null, 2));
    setFormRetryAttempts(j.retryAttempts ?? 3);
    setFormRetryDelay(j.retryDelaySeconds ?? 60);
    setFormTimeout(j.timeoutSeconds ?? 300);
  }

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formExpression.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      let parsedPayload = {};
      try { parsedPayload = JSON.parse(formPayload); } catch { /* ignore */ }
      const sdk = getSdk();
      // targetType is immutable per scheduler.md §8 (CRON-04 DTO) — only send
      // the matching target id alongside the mutable fields.
      await sdk.cron.update(projectId, jobId, {
        name: formName.trim(),
        cronExpression: formExpression.trim(),
        timezone: formTimezone,
        ...(formTargetType === 'http'
          ? { endpoint: formEndpoint }
          : { functionId: formFunctionId }),
        payload: parsedPayload,
        retryAttempts: formRetryAttempts,
        retryDelaySeconds: formRetryDelay,
        timeoutSeconds: formTimeout,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }, [getSdk, projectId, jobId, formName, formExpression, formTimezone, formTargetType, formEndpoint, formFunctionId, formPayload, formRetryAttempts, formRetryDelay, formTimeout]);

  return {
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
    saving, saveError,
    populateForm, handleSave,
  };
}
