'use client';

import { Button, Input } from '@fidscript/ui';
import type { Function_, Queue } from '@/types';
import { ActionTypePicker } from '@/app/(app)/scheduler/job-form-action-type-picker';
import { RetryConfig } from '@/app/(app)/scheduler/job-form-retry-config';
import { EmailActionFields } from '@/app/(app)/scheduler/job-form-email-fields';
import { QueueActionFields } from '@/app/(app)/scheduler/job-form-queue-fields';
import { FunctionActionFields } from '@/app/(app)/scheduler/job-form-function-fields';
import { HttpEndpointFields } from '@/app/(app)/scheduler/job-form-http-fields';
import { TIMEZONES } from './job-edit-types';
import type { JobEditForm } from './job-edit-types';
export type { JobEditForm } from './job-edit-types';

interface Props {
  saving: boolean;
  saveError: string | null;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  form: JobEditForm;
  setForm: (updater: (prev: JobEditForm) => JobEditForm) => void;
  functions?: Function_[];
  queues?: Queue[];
}

export function JobEditFormBody({
  saving, saveError, onSave, onClose,
  form, setForm,
  functions = [], queues = [],
}: Props) {
  const set = (fields: Partial<JobEditForm>) => setForm(prev => ({ ...prev, ...fields }));

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
        <Input value={form.name} onChange={e => set({ name: e.target.value })}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Cron expression</label>
          <Input value={form.expression} onChange={e => set({ expression: e.target.value })}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
          <select value={form.timezone} onChange={e => set({ timezone: e.target.value })}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <ActionTypePicker value={form.actionType} onChange={v => set({ actionType: v })} name="editActionType" />

      {form.actionType === 'http' && (
        <HttpEndpointFields
          endpoint={form.endpoint} httpMethod="POST" httpHeaders={[]}
          onEndpointChange={v => set({ endpoint: v })}
          onMethodChange={() => { /* not editable in edit form */ }}
          onHeadersChange={() => { /* not editable in edit form */ }}
        />
      )}

      {form.actionType === 'function' && (
        <FunctionActionFields
          functions={functions} loading={false}
          value={form.functionId} onChange={v => set({ functionId: v })}
        />
      )}

      {form.actionType === 'email' && (
        <EmailActionFields
          from={form.emailFrom} onFromChange={v => set({ emailFrom: v })}
          to={form.emailTo} onToChange={v => set({ emailTo: v })}
          subject={form.emailSubject} onSubjectChange={v => set({ emailSubject: v })}
          body={form.emailBody} onBodyChange={v => set({ emailBody: v })}
        />
      )}

      {form.actionType === 'queue' && (
        <QueueActionFields
          queues={queues} loadingQueues={false}
          queueId={form.queueId} onQueueIdChange={v => set({ queueId: v })}
          body={form.queueBody} onBodyChange={v => set({ queueBody: v })}
          delaySeconds={form.queueDelaySeconds}
          onDelayChange={v => set({ queueDelaySeconds: v })}
        />
      )}

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON)</label>
        <textarea value={form.payload} onChange={e => set({ payload: e.target.value })} rows={3}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]" />
      </div>

      <RetryConfig
        retryAttempts={form.retryAttempts}
        retryDelay={form.retryDelay}
        timeout={form.timeout}
        onRetryAttemptsChange={v => set({ retryAttempts: v })}
        onRetryDelayChange={v => set({ retryDelay: v })}
        onTimeoutChange={v => set({ timeout: v })}
      />

      {saveError && <p className="text-sm text-[var(--danger)]">{saveError}</p>}

      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" loading={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}