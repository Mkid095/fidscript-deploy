'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (email: string, password: string) => void;
  onCreate: (localPart: string, displayName?: string) => Promise<{ mailbox: { email: string }; password: string }>;
}

export function PlatformEmailCreateMailboxModal({ isOpen, onClose, onCreated, onCreate }: Props) {
  const [local, setLocal] = useState('');
  const [display, setDisplay] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!local.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await onCreate(local.trim(), display.trim() || undefined);
      onCreated(result.mailbox.email, result.password);
      setLocal('');
      setDisplay('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mailbox');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); setError(null); setLocal(''); setDisplay(''); }}
      title="New Platform Mailbox"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Local part (before @)</label>
          <Input
            value={local}
            onChange={e => setLocal(e.target.value)}
            placeholder="ops"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Display name (optional)</label>
          <Input
            value={display}
            onChange={e => setDisplay(e.target.value)}
            placeholder="Operations Team"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        {error && <p className="text-[var(--danger)] text-xs mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={() => { onClose(); setError(null); }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={creating}>
            {creating ? 'Creating…' : 'Create Mailbox'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
