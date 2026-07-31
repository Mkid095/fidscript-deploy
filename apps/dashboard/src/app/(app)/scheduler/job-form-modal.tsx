'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6am', value: '0 6 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly', value: '0 0 1 * *' },
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

function setDateTimeParts(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (expr === '* * * * *') return 'Every minute';
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`;
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every hour at minute ${min}`;
  if (dom === '*' && mon === '*' && dow === '*')
    return `Daily at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (dom === '*' && mon === '*')
    return `Weekly on ${DOW_LABELS[parseInt(dow)]} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  if (mon === '*' && dow === '*')
    return `Monthly on day ${dom} at ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  return expr;
}

function getNextRuns(expr: string, count: number): Date[] {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const [min, hour, dom, mon, dow] = parts;
  const now = new Date();
  const runs: Date[] = [];
  const minVal = parseInt(min);
  const hourVal = parseInt(hour);
  const domVal = parseInt(dom);
  const monVal = parseInt(mon);
  const dowVal = parseInt(dow);

  if (expr === '* * * * *') {
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 1); }
    return runs;
  }
  if (min.startsWith('*/')) {
    const step = parseInt(min.slice(2));
    let cursor = addMinutes(now, 1);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, step); }
    return runs;
  }
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, now.getHours(), minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 60);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 60); }
    return runs;
  }
  if (dom === '*' && mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    if (cursor <= now) cursor = addMinutes(cursor, 1440);
    while (runs.length < count) { runs.push(new Date(cursor)); cursor = addMinutes(cursor, 1440); }
    return runs;
  }
  if (dom === '*' && mon === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    while (cursor <= now || cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
    while (runs.length < count) {
      while (cursor.getDay() !== dowVal) cursor = addMinutes(cursor, 1);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 10080);
    }
    return runs;
  }
  if (mon === '*' && dow === '*') {
    let cursor = setDateTimeParts(now, hourVal, minVal);
    cursor.setDate(domVal);
    if (cursor <= now) cursor = addMinutes(cursor, 43200);
    while (runs.length < count) {
      while (cursor.getDate() !== domVal) cursor = addMinutes(cursor, 1440);
      runs.push(new Date(cursor));
      cursor = addMinutes(cursor, 43200);
    }
    return runs;
  }
  let cursor = addMinutes(now, 1);
  while (runs.length < count && cursor.getTime() - now.getTime() < 525600 * 60_000) {
    runs.push(new Date(cursor));
    cursor = addMinutes(cursor, 1);
  }
  return runs;
}

type Freq = 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

function CronBuilder({ value, timezone, onChange }: { value: string; timezone: string; onChange: (v: string) => void }) {
  const parts = value.trim().split(/\s+/);
  const isStandard = parts.length === 5;
  const [freq, setFreq] = useState<Freq>('daily');
  const [minute, setMinute] = useState(0);
  const [hour, setHour] = useState(0);
  const [dow, setDow] = useState(0);
  const [dom, setDom] = useState(1);

  useEffect(() => {
    if (!isStandard) return;
    const parse = (s: string) => s === '*' ? null : parseInt(s, 10);
    const [mS, hS, dS, moS, wS] = parts;
    const m = parse(mS), h = parse(hS), d = parse(dS), mo = parse(moS), w = parse(wS);
    if (value === '* * * * *') setFreq('minute');
    else if (m !== null && m % 5 === 0 && h === null && d === null && mo === null && w === null) setFreq('hourly');
    else if (d === null && mo === null && w === null) { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
    else if (d === null && mo === null) { setFreq('weekly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (w !== null) setDow(w); }
    else if (mo === null && w === null) { setFreq('monthly'); if (m !== null) setMinute(m); if (h !== null) setHour(h); if (d !== null) setDom(d); }
    else { setFreq('daily'); if (m !== null) setMinute(m); if (h !== null) setHour(h); }
  }, [value, isStandard]);

  const buildExpr = (f: Freq, mi: number, hr: number, dowVal?: number, domVal?: number): string => {
    switch (f) {
      case 'minute': return '* * * * *';
      case 'hourly': return `${mi} * * * *`;
      case 'daily': return `${mi} ${hr} * * *`;
      case 'weekly': return `${mi} ${hr} * * ${dowVal ?? 0}`;
      case 'monthly': return `${mi} ${hr} ${domVal ?? 1} * *`;
    }
  };

  const handleFreqChange = (f: Freq) => {
    setFreq(f);
    onChange(buildExpr(f, minute, hour, dow, dom));
  };
  const handleMinuteChange = (v: number) => { setMinute(v); onChange(buildExpr(freq, v, hour, dow, dom)); };
  const handleHourChange = (v: number) => { setHour(v); onChange(buildExpr(freq, minute, v, dow, dom)); };
  const handleDowChange = (v: number) => { setDow(v); onChange(buildExpr(freq, minute, hour, v, dom)); };
  const handleDomChange = (v: number) => { setDom(v); onChange(buildExpr(freq, minute, hour, dow, v)); };

  const previewRuns = isStandard ? getNextRuns(value, 3) : [];
  const description = describeCron(value);
  const inputCls = 'bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2 py-1 text-xs w-14 text-center';
  const labelCls = 'text-[10px] text-[var(--text-muted)]';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['minute','hourly','daily','weekly','monthly'] as Freq[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => handleFreqChange(f)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
              freq === f
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)]'
            }`}
          >
            {f === 'minute' ? 'Every min' : f === 'hourly' ? 'Hourly' : f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      {freq !== 'minute' && (
        <div className="flex flex-wrap items-center gap-3">
          {freq === 'hourly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>minute</span>
              <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)} className={inputCls} />
            </span>
          )}
          {(freq === 'daily' || freq === 'weekly' || freq === 'monthly') && (
            <>
              <span className="flex items-center gap-1">
                <span className={labelCls}>hour</span>
                <input type="number" min={0} max={23} value={hour} onChange={e => handleHourChange(parseInt(e.target.value) || 0)} className={inputCls} />
              </span>
              <span className="flex items-center gap-1">
                <span className={labelCls}>min</span>
                <input type="number" min={0} max={59} value={minute} onChange={e => handleMinuteChange(parseInt(e.target.value) || 0)} className={inputCls} />
              </span>
            </>
          )}
          {freq === 'weekly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day</span>
              <select value={dow} onChange={e => handleDowChange(parseInt(e.target.value))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-1.5 py-1 text-xs">
                {DOW_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
            </span>
          )}
          {freq === 'monthly' && (
            <span className="flex items-center gap-1">
              <span className={labelCls}>day of month</span>
              <input type="number" min={1} max={31} value={dom} onChange={e => handleDomChange(parseInt(e.target.value) || 1)} className={inputCls} />
            </span>
          )}
        </div>
      )}

      <div className="rounded border border-[var(--rail)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs text-[var(--text)]">
        <span className="text-[var(--text-muted)]">{description}</span>
        <span className="ml-3 text-[var(--accent)]">{value || '—'}</span>
      </div>

      {previewRuns.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-muted)] font-medium">Next runs</span>
          {previewRuns.map((r, i) => (
            <span key={i} className="text-[10px] text-[var(--text-dim)] font-mono">
              {r.toLocaleDateString()} {r.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
                  {t === 'HTTP Endpoint' ? 'HTTP Endpoint' : 'Function'}
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
