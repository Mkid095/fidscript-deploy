'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import type { CronJob } from '@/types';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily', value: '0 0 * * *' },
  { label: 'Weekly', value: '0 0 * * 0' },
];

interface Props {
  job: CronJob;
  saving: boolean;
  saveError: string | null;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  // form fields
  formName: string;
  setFormName: (v: string) => void;
  formExpression: string;
  setFormExpression: (v: string) => void;
  formTimezone: string;
  setFormTimezone: (v: string) => void;
  formTargetType: 'endpoint' | 'function';
  setFormTargetType: (v: 'endpoint' | 'function') => void;
  formEndpoint: string;
  setFormEndpoint: (v: string) => void;
  formFunctionId: string;
  setFormFunctionId: (v: string) => void;
  formPayload: string;
  setFormPayload: (v: string) => void;
  formRetryAttempts: number;
  setFormRetryAttempts: (v: number) => void;
  formRetryDelay: number;
  setFormRetryDelay: (v: number) => void;
  formTimeout: number;
  setFormTimeout: (v: number) => void;
}

export function JobEditModal({
  job,
  saving,
  saveError,
  onSave,
  onClose,
  formName, setFormName,
  formExpression, setFormExpression,
  formTimezone, setFormTimezone,
  formTargetType, setFormTargetType,
  formEndpoint, setFormEndpoint,
  formFunctionId, setFormFunctionId,
  formPayload, setFormPayload,
  formRetryAttempts, setFormRetryAttempts,
  formRetryDelay, setFormRetryDelay,
  formTimeout, setFormTimeout,
}: Props) {
  return (
    <Modal isOpen onClose={onClose} title="Edit Cron Job" size="lg">
      <form onSubmit={onSave} noValidate>
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Job name</label>
            <Input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Cron expression</label>
            <Input
              value={formExpression}
              onChange={e => setFormExpression(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CRON_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormExpression(p.value)}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timezone</label>
            <select
              value={formTimezone}
              onChange={e => setFormTimezone(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              {['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Singapore'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Target</label>
            <div className="flex gap-4">
              {(['endpoint', 'function'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                  <input
                    type="radio"
                    name="editTargetType"
                    value={t}
                    checked={formTargetType === t}
                    onChange={() => setFormTargetType(t)}
                    className="accent-[var(--accent)]"
                  />
                  {t === 'endpoint' ? 'HTTP Endpoint' : 'Function'}
                </label>
              ))}
            </div>
          </div>
          {formTargetType === 'endpoint' ? (
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">URL</label>
              <Input
                value={formEndpoint}
                onChange={e => setFormEndpoint(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Function ID</label>
              <Input
                value={formFunctionId}
                onChange={e => setFormFunctionId(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Payload (JSON)</label>
            <textarea
              value={formPayload}
              onChange={e => setFormPayload(e.target.value)}
              rows={3}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full font-mono text-xs resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retries</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={formRetryAttempts}
                onChange={e => setFormRetryAttempts(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Retry delay (s)</label>
              <Input
                type="number"
                min={1}
                max={3600}
                value={formRetryDelay}
                onChange={e => setFormRetryDelay(Math.max(1, parseInt(e.target.value) || 60))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Timeout (s)</label>
              <Input
                type="number"
                min={1}
                max={3600}
                value={formTimeout}
                onChange={e => setFormTimeout(Math.max(1, parseInt(e.target.value) || 300))}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full"
              />
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-[var(--danger)]">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--rail)]">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
