import type { FidscriptSDK } from '@fidscript-deploy/sdk';
'use client';
import type { ChangeEvent } from 'react';

import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';

interface CreateDomainModalProps {
  projectId: string;
  getSdk: () => FidscriptSDK;
  onCreated: (domain: import('@fidscript-deploy/sdk').EmailDomain) => void;
  onClose: () => void;
}

export function CreateDomainModal({ projectId, getSdk, onCreated, onClose }: CreateDomainModalProps) {
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const created = await getSdk().email.createDomain(projectId, domain.trim());
      onCreated(created as import('@fidscript-deploy/sdk').EmailDomain);
      setDomain('');
      onClose();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Domain">
      <form onSubmit={handleAdd} noValidate>
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Domain name</label>
          <Input
            value={domain}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDomain(e.target.value)}
            placeholder="mail.example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        {addError && <p className="text-[var(--danger)] text-xs mb-4">{addError}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={adding}>
            {adding ? 'Adding...' : 'Add Domain'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
