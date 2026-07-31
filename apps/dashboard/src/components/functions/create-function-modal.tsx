'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import type { Function_ } from '@/types';

interface CreateFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (fn: Function_) => void;
  onCreate: (data: { name: string; runtime: string }) => Promise<Function_>;
}

const RUNTIMES = [
  { value: 'nodejs20', label: 'Node.js 20', available: true },
  { value: 'python311', label: 'Python 3.11', available: true },
  { value: 'go', label: 'Go', available: false },
  { value: 'rust', label: 'Rust', available: false },
];

export function CreateFunctionModal({ isOpen, onClose, onCreated, onCreate }: CreateFunctionModalProps) {
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState('nodejs20');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setName('');
    setRuntime('nodejs20');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const created = await onCreate({ name: name.trim(), runtime });
      onCreated(created);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create function');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Function" size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Function name
          </label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="my-function"
            autoFocus
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">
            Runtime
          </label>
          <select
            value={runtime}
            onChange={e => setRuntime(e.target.value)}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm"
          >
            {RUNTIMES.map(r => (
              <option
                key={r.value}
                value={r.value}
                disabled={!r.available}
                style={!r.available ? { opacity: 0.4 } : undefined}
              >
                {r.label}{!r.available ? ' (coming soon)' : ''}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-[var(--danger)] text-xs">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={creating}
            disabled={!name.trim()}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
