'use client'
import type { ChangeEvent } from 'react';;

import { useState } from 'react';
import type { EmailDomain, EmailDomainCreated } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { Button, Input, Modal } from '@fidscript/ui';

interface Props {
  onClose: () => void;
  onAdded: (created: EmailDomain) => void;
}

/**
 * Add an email domain to a project.
 *
 * The API answers with the domain **and** the DNS records the operator has
 * to add before it can receive mail. The modal used to cast that envelope
 * to a domain row, which put the instructions in the bin and took the page
 * down with it.
 */
export function AddDomainModal({ onClose, onAdded }: Props) {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<EmailDomainCreated | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !domain.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await getSdk().email.createDomain(projectId, domain.trim());
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Modal isOpen onClose={onClose} title="Domain added — now point DNS at it">
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
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
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onAdded(created.domain);
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
