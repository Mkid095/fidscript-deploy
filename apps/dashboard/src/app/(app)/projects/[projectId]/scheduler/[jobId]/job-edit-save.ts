import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { CronJob } from '@/types';
import type { JobEditForm } from './job-edit-types';

export function buildJobUpdatePayload(form: JobEditForm): Record<string, unknown> {
  let parsedPayload: Record<string, unknown> = {};
  try { parsedPayload = JSON.parse(form.payload); } catch { /* ignore */ }

  const update: Record<string, unknown> = {
    name: form.name.trim(),
    cronExpression: form.expression.trim(),
    timezone: form.timezone,
    payload: parsedPayload,
    retryAttempts: form.retryAttempts,
    retryDelaySeconds: form.retryDelay,
    timeoutSeconds: form.timeout,
    actionType: form.actionType,
    endpoint: undefined,
    functionId: undefined,
    emailConfig: undefined,
    queueConfig: undefined,
    targetType: undefined,
  };

  if (form.actionType === 'http') {
    update.endpoint = form.endpoint;
    update.targetType = 'http';
  } else if (form.actionType === 'function') {
    update.functionId = form.functionId;
    update.targetType = 'function';
  } else if (form.actionType === 'email') {
    update.emailConfig = {
      to: form.emailTo,
      subject: form.emailSubject,
      text: form.emailBody,
      from: form.emailFrom || undefined,
    };
  } else if (form.actionType === 'queue') {
    let body: unknown = form.queueBody;
    try { if (form.queueBody.trim()) body = JSON.parse(form.queueBody); } catch { /* keep raw */ }
    update.queueConfig = {
      queueId: form.queueId,
      body,
      delaySeconds: form.queueDelaySeconds,
    };
  }

  return update;
}

export function detectActionType(j: CronJob): JobEditForm['actionType'] {
  if (j.actionType === 'email' || j.emailConfig) return 'email';
  if (j.actionType === 'queue' || j.queueConfig) return 'queue';
  if (j.actionType === 'function' || j.functionId) return 'function';
  return 'http';
}

export async function persistJobUpdate(
  sdk: FidscriptSDK,
  projectId: string,
  jobId: string,
  form: JobEditForm,
): Promise<CronJob> {
  const update = buildJobUpdatePayload(form);
  return sdk.cron.update(projectId, jobId, update as Partial<CronJob>);
}