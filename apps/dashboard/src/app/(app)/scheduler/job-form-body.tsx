'use client';

import { Button, Input } from '@fidscript/ui';
import type { Function_, Queue } from '@/types';
import { ScheduleField } from './schedule-field';
import { EmailActionFields } from './job-form-email-fields';
import { QueueActionFields } from './job-form-queue-fields';
import { HttpEndpointFields } from './job-form-http-fields';
import { FunctionActionFields } from './job-form-function-fields';
import { ActionTypePicker } from './job-form-action-type-picker';
import { RetryConfig } from './job-form-retry-config';
import { TIMEZONES } from './job-form-types';
import type { JobForm } from './job-form-types';
export type { JobForm } from './job-form-types';

interface JobFormBodyProps {
  form: JobForm;
  onFieldChange: (fields: Partial<JobForm>) => void;
  error: string | null;
  onCancel: () => void;
  loading: boolean;
  functions: Function_[];
  loadingFunctions: boolean;
  queues: Queue[];
  loadingQueues: boolean;
}

export function JobFormBody({
  form, onFieldChange, error, onCancel, loading,
  functions, loadingFunctions, queues, loadingQueues,
}: JobFormBodyProps) {
  const set = (fields: Partial<JobForm>) => onFieldChange(fields);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
        <Input value={form.name} onChange={e => set({ name: e.target.value })}
          placeholder="e.g. daily-backup"
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
      </div>

      <ScheduleField expression={form.expression} timezone={form.timezone}
        onChange={v => set({ expression: v })} />

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
        <select value={form.timezone} onChange={e => set({ timezone: e.target.value })}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      <ActionTypePicker value={form.actionType} onChange={v => set({ actionType: v })} />

      {form.actionType === 'endpoint' && (
        <HttpEndpointFields
          endpoint={form.endpoint} httpMethod={form.httpMethod} httpHeaders={form.httpHeaders}
          onEndpointChange={v => set({ endpoint: v })}
          onMethodChange={v => set({ httpMethod: v })}
          onHeadersChange={headers => set({ httpHeaders: headers })}
        />
      )}

      {form.actionType === 'function' && (
        <FunctionActionFields
          functions={functions} loading={loadingFunctions}
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
          queues={queues} loadingQueues={loadingQueues}
          queueId={form.queueId} onQueueIdChange={v => set({ queueId: v })}
          body={form.queueBody} onBodyChange={v => set({ queueBody: v })}
          delaySeconds={form.queueDelaySeconds}
          onDelayChange={v => set({ queueDelaySeconds: v })}
        />
      )}

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON, optional)</label>
        <textarea value={form.payload} onChange={e => set({ payload: e.target.value })}
          placeholder="{}" rows={2}
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

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" loading={loading}
          disabled={!form.name.trim() || !form.expression.trim()}>
          {loading ? 'Creating…' : 'Create job'}
        </Button>
      </div>
    </div>
  );
}