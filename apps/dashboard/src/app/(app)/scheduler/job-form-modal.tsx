'use client';

import { Button, Input, Modal } from '@fidscript/ui';
import { CronBuilder } from './cron-builder';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6am', value: '0 6 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly', value: '0 0 1 * *' },
];

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
  const set = (fields: Partial<typeof form>) => onFieldChange(fields);

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
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
            <Input
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              placeholder="e.g. daily-backup"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Schedule</label>
            <CronBuilder value={form.expression} timezone={form.timezone} onChange={v => set({ expression: v })} />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {CRON_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set({ expression: p.value })}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => set({ timezone: e.target.value })}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
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
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">URL</label>
              <Input value={form.endpoint} onChange={e => set({ endpoint: e.target.value })}
                placeholder="https://api.example.com/webhook"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function ID</label>
              <Input value={form.functionId} onChange={e => set({ functionId: e.target.value })}
                placeholder="func_xxxxxxxxxxxx"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full" />
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
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={loading} disabled={!form.name.trim() || !form.expression.trim()}>
              {loading ? 'Creating…' : 'Create job'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
