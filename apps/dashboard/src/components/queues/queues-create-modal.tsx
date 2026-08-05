'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Share01Icon, Database01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';

interface QueuesCreateModalProps {
  onClose: () => void;
  onConfirm: (name: string, type: string) => void;
  submitting: boolean;
}

const QUEUE_TYPES = [
  { value: 'stream',    label: 'NATS JetStream', icon: Share01Icon,  desc: 'High-throughput, durable' },
  { value: 'workqueue', label: 'Work Queue',      icon: null,         desc: 'Single consumer, at-least-once' },
  { value: 'queue',     label: 'Redis Queue',     icon: Database01Icon, desc: 'In-memory, fast' },
];

export function QueuesCreateModal({ onClose, onConfirm, submitting }: QueuesCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('stream');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Create New Queue</h2>
          <button
            onClick={() => !submitting && onClose()}
            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Queue Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. email-sender"
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-dim)]/40 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-dim)] mb-1.5">Queue Type</label>
            <div className="grid grid-cols-2 gap-2">
              {QUEUE_TYPES.map(({ value, label, icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    type === value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--rail)] hover:border-[var(--accent)]/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {icon && (
                      <HugeiconsIcon
                        icon={icon}
                        size={13}
                        className={type === value ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}
                      />
                    )}
                    <span className="text-xs font-medium text-[var(--text)]">{label}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-dim)]">{desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || submitting}>
              {submitting ? 'Creating…' : 'Create Queue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
