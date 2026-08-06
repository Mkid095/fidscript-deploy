'use client';

import { Button, Input } from '@fidscript/ui';
import type { Function_ } from '@/types';
import { ScheduleField } from './schedule-field';
import { HttpHeadersInput } from './http-headers-input';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

type JobForm = {
  name: string; expression: string; timezone: string;
  targetType: 'endpoint' | 'function'; endpoint: string;
  httpMethod: string; httpHeaders: { key: string; value: string }[];
  functionId: string; payload: string;
  retryAttempts: number; retryDelay: number; timeout: number;
};

interface JobFormBodyProps {
  form: JobForm;
  onFieldChange: (fields: Partial<JobForm>) => void;
  error: string | null;
  onCancel: () => void;
  onSubmit: () => void;
  loading: boolean;
  functions: Function_[];
  loadingFunctions: boolean;
}

export function JobFormBody({ form, onFieldChange, error, onCancel, onSubmit, loading, functions, loadingFunctions }: JobFormBodyProps) {
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

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Target</label>
        <div className="flex gap-4">
          {(['endpoint', 'function'] as const).map(t => (
            <label key={t} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
              <input type="radio" name="targetType" value={t} checked={form.targetType === t}
                onChange={() => set({ targetType: t })} className="accent-[var(--accent)]" />
              {t === 'endpoint' ? 'HTTP Endpoint' : 'Function'}
            </label>
          ))}
        </div>
      </div>

      {form.targetType === 'endpoint' ? (
        <>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">URL</label>
            <Input value={form.endpoint} onChange={e => set({ endpoint: e.target.value })}
              placeholder="https://api.example.com/webhook"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Method</label>
              <select value={form.httpMethod} onChange={e => set({ httpMethod: e.target.value })}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <HttpHeadersInput
              headers={form.httpHeaders}
              onChange={headers => set({ httpHeaders: headers })}
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function</label>
          {loadingFunctions ? (
            <p className="text-xs text-[var(--text-muted)] italic py-2">Loading functions…</p>
          ) : functions.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic py-2">No functions in this project yet.</p>
          ) : (
            <select value={form.functionId} onChange={e => set({ functionId: e.target.value })}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Select a function…</option>
              {functions.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.runtime})</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON, optional)</label>
        <textarea value={form.payload} onChange={e => set({ payload: e.target.value })}
          placeholder="{}" rows={2}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retries</label>
          <Input type="number" min={0} max={10} value={form.retryAttempts}
            onChange={e => set({ retryAttempts: Math.max(0, parseInt(e.target.value) || 0) })}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retry delay (s)</label>
          <Input type="number" min={1} max={3600} value={form.retryDelay}
            onChange={e => set({ retryDelay: Math.max(1, parseInt(e.target.value) || 60) })}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timeout (s)</label>
          <Input type="number" min={1} max={3600} value={form.timeout}
            onChange={e => set({ timeout: Math.max(1, parseInt(e.target.value) || 300) })}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" loading={loading} disabled={!form.name.trim() || !form.expression.trim()}>
          {loading ? 'Creating…' : 'Create job'}
        </Button>
      </div>
    </div>
  );
}
