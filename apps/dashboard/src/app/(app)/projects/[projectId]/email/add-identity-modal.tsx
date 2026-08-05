'use client';

import { useEffect, useState } from 'react';
import type { EmailDomain } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { API_BASE_URL } from '@/lib/sdk';
import { Button, Input, Modal } from '@fidscript/ui';

export interface SenderIdentity {
  id: string;
  domainId: string;
  email: string;
  name?: string;
  isVerified: boolean;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  onCreated: (identity: SenderIdentity) => void;
}

export function AddIdentityModal({ onClose, onCreated }: Props) {
  const { getSdk, getToken } = useAuth();
  const projectId = useShellProjectId();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [domainId, setDomainId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      try {
        const list = await getSdk().email.listDomains(projectId);
        const active = list.filter(d => d.status === 'ACTIVE');
        setDomains(active);
        if (active.length > 0 && active[0]) setDomainId(active[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domains');
      }
    })();
  }, [getSdk, projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !domainId || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const domain = domains.find(d => d.id === domainId);
      if (!domain) throw new Error('Pick a verified (ACTIVE) domain');
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/sender-identities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            domain: domain.domain,
            email: email.trim(),
            name: name.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as SenderIdentity;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create identity');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Sender Identity">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Verified domain</label>
          <select
            value={domainId}
            onChange={e => setDomainId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--rail)] rounded text-[var(--text)]"
          >
            {domains.length === 0 && <option value="">No ACTIVE domains</option>}
            {domains.map(d => <option key={d.id} value={d.id}>{d.domain}</option>)}
          </select>
          <p className="text-[10px] text-[var(--text-dim)] mt-1">
            The domain must be ACTIVE (DKIM/SPF/DMARC/MX verified).
          </p>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">From address</label>
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="noreply@example.com"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Display name (optional)</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="FIDScript Notifications" />
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            type="submit"
            size="sm"
            loading={busy}
            disabled={!domainId || !email.trim()}
          >
            Create Identity
          </Button>
        </div>
      </form>
    </Modal>
  );
}
