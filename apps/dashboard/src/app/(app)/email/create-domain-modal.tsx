'use client';
import type { ChangeEvent } from 'react';

import { useState } from 'react';
import type { EmailDomain, EmailDomainCreated } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';

interface CreateDomainModalProps {
  projectId: string;
  getSdk: () => import('@fidscript-deploy/sdk').FidscriptSDK;
  onCreated: (domain: EmailDomain) => void;
  onClose: () => void;
}

/**
 * Add an email domain.
 *
 * The API answers with the domain **and** the DNS records the operator has
 * to add before it can receive mail. The modal used to cast that envelope
 * to a domain row, which put the instructions in the bin and took the whole
 * email screen down with it. The instructions are shown here instead: a
 * domain that is added and never configured is a domain that never works.
 */
export function CreateDomainModal({ projectId, getSdk, onCreated, onClose }: CreateDomainModalProps) {
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [created, setCreated] = useState<EmailDomainCreated | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const result = await getSdk().email.createDomain(projectId, domain.trim());
      setCreated(result);
      setDomain('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  if (created) {
    return (
      <Modal isOpen onClose={onClose} title="Domain added — now point DNS at it">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            <span className="text-[var(--text)] font-medium">{created.domain.domain}</span> is registered.
            Add these records at your DNS provider, then verify the domain.
          </p>
          <ol className="space-y-2">
            {created.steps.map((step, i) => (
              <li key={i} className="text-xs text-[var(--text-muted)] flex gap-2">
                <span className="text-[var(--text-dim)] flex-shrink-0">{i + 1}.</span>
                <span className="font-mono break-words">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onCreated(created.domain);
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
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
