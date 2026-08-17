'use client'
import type { ChangeEvent } from 'react';;

import { useState } from 'react';
import type { EmailDomain } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { Button, Input, Modal } from '@fidscript/ui';

interface Props {
  onClose: () => void;
  onAdded: (created: EmailDomain) => void;
}

export function AddDomainModal({ onClose, onAdded }: Props) {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !domain.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await getSdk().email.createDomain(projectId, domain.trim()) as EmailDomain;
      onAdded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Email Domain">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Domain</label>
          <Input
            value={domain}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDomain(e.target.value)}
            placeholder="mail.example.com"
            autoFocus
          />
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={busy} disabled={!domain.trim()}>
            Add Domain
          </Button>
        </div>
      </form>
    </Modal>
  );
}
