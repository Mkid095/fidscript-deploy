'use client'
import type { ChangeEvent } from 'react';;

import { useEffect, useState } from 'react';
import type { EmailDomain, Mailbox } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { Button, Input, Modal } from '@fidscript/ui';

interface Props {
  onClose: () => void;
  onCreated: (mailbox: Mailbox) => void;
}

export function AddMailboxModal({ onClose, onCreated }: Props) {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [domainId, setDomainId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Mailbox | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const list = await getSdk().email.listDomains(projectId);
        setDomains(list);
        if (list.length > 0 && list[0]) setDomainId(list[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domains');
      }
    })();
  }, [getSdk, projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !domainId || !localPart.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const domain = domains.find(d => d.id === domainId);
      if (!domain) throw new Error('Pick a domain');
      const mailbox = await getSdk().email.createMailbox(projectId, {
        domain: domain.domain,
        localPart: localPart.trim(),
        // password is ignored by the backend; we still must send *something* for the DTO.
        password: 'ignored-by-backend',
        name: name.trim() || undefined,
      });
      setRevealed(mailbox);
      onCreated(mailbox);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mailbox');
    } finally {
      setBusy(false);
    }
  }

  if (revealed) {
    return (
      <Modal isOpen onClose={onClose} title="Mailbox created — copy the password now">
        <div className="space-y-3 text-xs">
          <p className="text-[var(--text-dim)]">
            The platform ignores the password you submitted and generated its own. It is shown
            here <strong className="text-[var(--text)]">once</strong>; copy it now.
          </p>
          <div className="rounded border border-[var(--rail)] bg-[var(--surface-2)] p-3 font-mono break-all">
            {String((revealed as unknown as { password?: string }).password ?? '(no password returned)')}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Mailbox">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Domain</label>
          <select
            value={domainId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded text-[var(--text)]"
          >
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.domain}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Local part</label>
          <Input
            value={localPart}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalPart(e.target.value)}
            placeholder="alice"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Display name (optional)</label>
          <Input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Alice Adams" />
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            type="submit"
            size="sm"
            loading={busy}
            disabled={!domainId || !localPart.trim()}
          >
            Create Mailbox
          </Button>
        </div>
      </form>
    </Modal>
  );
}
