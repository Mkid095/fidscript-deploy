'use client';

import { Modal } from '@fidscript/ui';
import type { CronJob } from '@/types';
import { JobEditFormBody, type JobEditForm } from './job-edit-form-body';

interface Props {
  job: CronJob;
  saving: boolean;
  saveError: string | null;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  form: JobEditForm;
  setForm: (updater: (prev: JobEditForm) => JobEditForm) => void;
}

export function JobEditModal({ job, saving, saveError, onSave, onClose, form, setForm }: Props) {
  return (
    <Modal isOpen onClose={onClose} title={`Edit Cron Job — ${job.name}`} size="lg">
      <form onSubmit={onSave} noValidate>
        <JobEditFormBody
          saving={saving}
          saveError={saveError}
          onSave={onSave}
          onClose={onClose}
          form={form}
          setForm={setForm}
        />
      </form>
    </Modal>
  );
}