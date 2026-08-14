'use client';

import { Modal } from '@fidscript/ui';
import type { CronJob, Function_, Queue } from '@/types';
import { JobEditFormBody, type JobEditForm } from './job-edit-form-body';

interface Props {
  isOpen: boolean;
  job: CronJob;
  saving: boolean;
  saveError: string | null;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  form: JobEditForm;
  setForm: (updater: (prev: JobEditForm) => JobEditForm) => void;
  functions?: Function_[];
  queues?: Queue[];
}

export function JobEditModal({ isOpen, job, saving, saveError, onSave, onClose, form, setForm, functions, queues }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Cron Job — ${job.name}`} size="lg">
      <form onSubmit={onSave} noValidate>
        <JobEditFormBody
          saving={saving}
          saveError={saveError}
          onSave={onSave}
          onClose={onClose}
          form={form}
          setForm={setForm}
          functions={functions}
          queues={queues}
        />
      </form>
    </Modal>
  );
}