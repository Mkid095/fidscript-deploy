'use client';

import { Modal } from '@fidscript/ui';
import { JobFormBody } from './job-form-body';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string; cronExpression: string; timezone: string; payload: Record<string, unknown>;
    retryAttempts: number; retryDelaySeconds: number; timeoutSeconds: number;
    endpoint?: string; functionId?: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
  form: {
    name: string; expression: string; timezone: string;
    targetType: 'endpoint' | 'function'; endpoint: string; functionId: string;
    payload: string; retryAttempts: number; retryDelay: number; timeout: number;
  };
  onFieldChange: (fields: Partial<JobFormModalProps['form']>) => void;
}

export function JobFormModal({ isOpen, onClose, onSubmit, loading, error, form, onFieldChange }: JobFormModalProps) {
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
        />
      </form>
    </Modal>
  );
}
