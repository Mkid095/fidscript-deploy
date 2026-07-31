'use client';

import { Modal } from '@fidscript/ui';
import type { CronJob } from '@/types';
import { JobEditFormBody } from './job-edit-form-body';

interface Props {
  job: CronJob;
  saving: boolean;
  saveError: string | null;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  formName: string; setFormName: (v: string) => void;
  formExpression: string; setFormExpression: (v: string) => void;
  formTimezone: string; setFormTimezone: (v: string) => void;
  formTargetType: 'endpoint' | 'function'; setFormTargetType: (v: 'endpoint' | 'function') => void;
  formEndpoint: string; setFormEndpoint: (v: string) => void;
  formFunctionId: string; setFormFunctionId: (v: string) => void;
  formPayload: string; setFormPayload: (v: string) => void;
  formRetryAttempts: number; setFormRetryAttempts: (v: number) => void;
  formRetryDelay: number; setFormRetryDelay: (v: number) => void;
  formTimeout: number; setFormTimeout: (v: number) => void;
}

export function JobEditModal(props: Props) {
  return (
    <Modal isOpen onClose={props.onClose} title="Edit Cron Job" size="lg">
      <JobEditFormBody {...props} />
    </Modal>
  );
}
