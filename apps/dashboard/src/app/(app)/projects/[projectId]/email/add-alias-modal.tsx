'use client'
import type { ChangeEvent } from 'react';;

import { useEffect, useState } from 'react';
import type { EmailAlias, EmailDomain } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { Button, Input, Modal } from '@fidscript/ui';

type Target = { type: 'mailbox' | 'external' | 'webhook'; address?: string; url?: string };

interface Props {
  onClose: () => void;
  onCreated: (alias: EmailAlias) => void;
}

export function AddAliasModal({ onClose, onCreated }: Props) {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [domainId, setDomainId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [targetType, setTargetType] = useState<'external' | 'webhook'>('external');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!projectId || !domainId || !localPart.trim() || !target.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const domain = domains.find(d => d.id === domainId);
      if (!domain) throw new Error('Pick a domain');
      const payload: { type: Target['type']; address?: string; url?: string } =
        targetType === 'webhook' ? { type: 'webhook', url: target.trim() } : { type: 'external', address: target.trim() };
      const created = await getSdk().email.createAlias(projectId, {
        domain: domain.domain,
        localPart: localPart.trim(),
        targets: [payload],
        description: description.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alias');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Alias">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Domain</label>
          <select
            value={domainId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded text-[var(--text)]"
          >
            {domains.map(d => <option key={d.id} value={d.id}>{d.domain}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Local part</label>
          <Input value={localPart} onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalPart(e.target.value)} placeholder="hello" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">Target type</label>
            <select
              value={targetType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetType(e.target.value as 'external' | 'webhook')}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded text-[var(--text)]"
            >
              <option value="external">External address</option>
              <option value="webhook">Webhook URL</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">
              {targetType === 'webhook' ? 'Webhook URL' : 'Forward to'}
            </label>
            <Input
              value={target}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTarget(e.target.value)}
              placeholder={targetType === 'webhook' ? 'https://example.com/hook' : 'alice@example.com'}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Description (optional)</label>
          <Input value={description} onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} placeholder="Support inbox" />
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" size="sm" loading={busy} disabled={!domainId || !localPart.trim() || !target.trim()}>
            Create Alias
          </Button>
        </div>
      </form>
    </Modal>
  );
}
