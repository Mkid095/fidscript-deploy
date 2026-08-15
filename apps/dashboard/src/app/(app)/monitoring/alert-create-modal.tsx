'use client';

import type { ChangeEvent } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import type { NotificationChannel } from '@/types';

interface Props {
  isOpen: boolean;
  creating: boolean;
  createError: string | null;
  channels: NotificationChannel[];
  formName: string;
  setFormName: (v: string) => void;
  formMetric: string;
  setFormMetric: (v: string) => void;
  formCondition: string;
  setFormCondition: (v: string) => void;
  formThreshold: string;
  setFormThreshold: (v: string) => void;
  formSeverity: string;
  setFormSeverity: (v: string) => void;
  formDuration: string;
  setFormDuration: (v: string) => void;
  formChannel: string;
  setFormChannel: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onReset: () => void;
  METRICS: string[];
  INTERVALS: string[];
}

export function AlertCreateModal({
  isOpen, creating, createError, channels,
  formName, setFormName,
  formMetric, setFormMetric,
  formCondition, setFormCondition,
  formThreshold, setFormThreshold,
  formSeverity, setFormSeverity,
  formDuration, setFormDuration,
  formChannel, setFormChannel,
  onSubmit, onClose, onReset,
  METRICS, INTERVALS,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); onReset(); }} title="Create Alert Rule" size="md">
      <form onSubmit={onSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Rule name</label>
            <Input
              value={formName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
              placeholder="High CPU usage"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Metric</label>
            <select
              value={formMetric}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormMetric(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Select a metric...</option>
              {METRICS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Condition</label>
              <select
                value={formCondition}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormCondition(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
                <option value="equals">Equals</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Threshold</label>
              <Input
                value={formThreshold}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormThreshold(e.target.value)}
                placeholder="80"
                type="number"
                step="any"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Severity</label>
              <select
                value={formSeverity}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormSeverity(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Interval</label>
              <select
                value={formDuration}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormDuration(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
              >
                {INTERVALS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
          {createError && <p className="text-[var(--danger)] text-xs">{createError}</p>}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Notification Channel</label>
            <select
              value={formChannel}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormChannel(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">No channel (alerts logged only)</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name} ({ch.type})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => { onClose(); onReset(); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
