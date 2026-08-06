'use client';

import { useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Function_, Queue } from '@/types';
import { Modal } from '@fidscript/ui';
import { JobFormBody, type JobForm } from './job-form-body';

interface JobFormModalProps {
  isOpen: boolean;
  sdk: FidscriptSDK | null;
  projectId: string;
  onClose: () => void;
  onSubmit: (data: JobFormSubmitData) => Promise<void>;
  loading: boolean;
  error: string | null;
  form: JobForm;
  onFieldChange: (fields: Partial<JobForm>) => void;
}

export interface JobFormSubmitData {
  name: string;
  cronExpression: string;
  timezone: string;
  payload: Record<string, unknown>;
  retryAttempts: number;
  retryDelaySeconds: number;
  timeoutSeconds: number;
  actionType: JobForm['actionType'];
  endpoint?: string;
  httpMethod?: string;
  httpHeaders?: { key: string; value: string }[];
  functionId?: string;
  emailConfig?: { to: string; subject: string; text?: string; from?: string };
  queueConfig?: { queueId: string; body?: unknown; delaySeconds?: number };
}

export function JobFormModal({
  isOpen, sdk, projectId, onClose, onSubmit, loading, error, form, onFieldChange,
}: JobFormModalProps) {
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loadingQueues, setLoadingQueues] = useState(false);

  useEffect(() => {
    if (!isOpen || !sdk || !projectId) return;
    let cancelled = false;
    setLoadingFunctions(true);
    setLoadingQueues(true);
    sdk.functions.list(projectId)
      .then(data => { if (!cancelled) setFunctions(data as Function_[]); })
      .catch(() => { if (!cancelled) setFunctions([]); })
      .finally(() => { if (!cancelled) setLoadingFunctions(false); });
    sdk.queues.list(projectId)
      .then(data => { if (!cancelled) setQueues(data as Queue[]); })
      .catch(() => { if (!cancelled) setQueues([]); })
      .finally(() => { if (!cancelled) setLoadingQueues(false); });
    return () => { cancelled = true; };
  }, [isOpen, sdk, projectId]);

  function buildSubmitData(): JobFormSubmitData {
    let parsedPayload: Record<string, unknown> = {};
    try { parsedPayload = JSON.parse(form.payload); } catch { /* ignore */ }

    const base: JobFormSubmitData = {
      name: form.name,
      cronExpression: form.expression,
      timezone: form.timezone,
      payload: parsedPayload,
      retryAttempts: form.retryAttempts,
      retryDelaySeconds: form.retryDelay,
      timeoutSeconds: form.timeout,
      actionType: form.actionType,
    };

    if (form.actionType === 'http') {
      base.endpoint = form.endpoint;
      base.httpMethod = form.httpMethod;
      base.httpHeaders = form.httpHeaders;
    } else if (form.actionType === 'function') {
      base.functionId = form.functionId;
    } else if (form.actionType === 'email') {
      base.emailConfig = {
        to: form.emailTo,
        subject: form.emailSubject,
        text: form.emailBody,
        from: form.emailFrom || undefined,
      };
    } else if (form.actionType === 'queue') {
      let body: unknown = form.queueBody;
      try { if (form.queueBody.trim()) body = JSON.parse(form.queueBody); } catch { /* keep raw */ }
      base.queueConfig = {
        queueId: form.queueId,
        body,
        delaySeconds: form.queueDelaySeconds,
      };
    }

    return base;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Cron Job" size="lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit(buildSubmitData());
        }}
        noValidate
      >
        <JobFormBody
          form={form}
          onFieldChange={onFieldChange}
          error={error}
          onCancel={onClose}
          loading={loading}
          functions={functions}
          loadingFunctions={loadingFunctions}
          queues={queues}
          loadingQueues={loadingQueues}
        />
      </form>
    </Modal>
  );
}