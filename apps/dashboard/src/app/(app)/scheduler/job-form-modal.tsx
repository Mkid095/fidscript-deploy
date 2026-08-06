'use client';

import { useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Function_ } from '@/types';
import { Modal } from '@fidscript/ui';
import { JobFormBody } from './job-form-body';

interface JobFormModalProps {
  isOpen: boolean;
  sdk: FidscriptSDK | null;
  projectId: string;
  onClose: () => void;
  onSubmit: (data: {
    name: string; cronExpression: string; timezone: string; payload: Record<string, unknown>;
    retryAttempts: number; retryDelaySeconds: number; timeoutSeconds: number;
    endpoint?: string; httpMethod?: string;
    httpHeaders?: { key: string; value: string }[];
    functionId?: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
  form: {
    name: string; expression: string; timezone: string;
    targetType: 'endpoint' | 'function'; endpoint: string;
    httpMethod: string; httpHeaders: { key: string; value: string }[];
    functionId: string; payload: string;
    retryAttempts: number; retryDelay: number; timeout: number;
  };
  onFieldChange: (fields: Partial<JobFormModalProps['form']>) => void;
}

export function JobFormModal({ isOpen, sdk, projectId, onClose, onSubmit, loading, error, form, onFieldChange }: JobFormModalProps) {
  const [functions, setFunctions] = useState<Function_[]>([]);
  const [loadingFunctions, setLoadingFunctions] = useState(false);

  useEffect(() => {
    if (!isOpen || !sdk || !projectId) return;
    let cancelled = false;
    setLoadingFunctions(true);
    sdk.functions.list(projectId)
      .then(data => { if (!cancelled) setFunctions(data as Function_[]); })
      .catch(() => { if (!cancelled) setFunctions([]); })
      .finally(() => { if (!cancelled) setLoadingFunctions(false); });
    return () => { cancelled = true; };
  }, [isOpen, sdk, projectId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Cron Job" size="lg">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          let parsedPayload: Record<string, unknown> = {};
          try { parsedPayload = JSON.parse(form.payload); } catch { /* ignore */ }
          await onSubmit({
            name: form.name,
            cronExpression: form.expression,
            timezone: form.timezone,
            payload: parsedPayload,
            retryAttempts: form.retryAttempts,
            retryDelaySeconds: form.retryDelay,
            timeoutSeconds: form.timeout,
            endpoint: form.targetType === 'endpoint' ? form.endpoint : undefined,
            httpMethod: form.targetType === 'endpoint' ? form.httpMethod : undefined,
            httpHeaders: form.targetType === 'endpoint' ? form.httpHeaders : undefined,
            functionId: form.targetType === 'function' ? form.functionId : undefined,
          });
        }}
        noValidate
      >
        <JobFormBody
          form={form}
          onFieldChange={onFieldChange}
          error={error}
          onCancel={onClose}
          onSubmit={() => {}}
          loading={loading}
          functions={functions}
          loadingFunctions={loadingFunctions}
        />
      </form>
    </Modal>
  );
}
