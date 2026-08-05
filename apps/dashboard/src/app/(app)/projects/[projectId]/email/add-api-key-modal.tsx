'use client';

import { useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { API_BASE_URL } from '@/lib/sdk';
import { Button, Input, Modal } from '@fidscript/ui';

export interface EmailApiKey {
  id: string;
  name: string;
  scopes: string[];
  dailyLimit: number;
  monthlyLimit: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

/** Returned ONLY from the create endpoint — the raw key is shown once. */
export interface EmailApiKeyCreated extends EmailApiKey {
  key: string;
}

interface Props {
  onClose: () => void;
  onCreated: (created: EmailApiKey) => void;
}

export function AddApiKeyModal({ onClose, onCreated }: Props) {
  const { getToken } = useAuth();
  const projectId = useShellProjectId();
  const [name, setName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [monthlyLimit, setMonthlyLimit] = useState('30000');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<EmailApiKeyCreated | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/api-keys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: name.trim(),
            scopes: ['email.send'],
            dailyLimit: Number(dailyLimit) || 1000,
            monthlyLimit: Number(monthlyLimit) || 30000,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as EmailApiKeyCreated;
      setRevealed(created);
      // Hand the parent the persisted (no-secret) shape; raw `key` is shown above.
      const { key: _omit, ...rest } = created;
      void _omit;
      onCreated(rest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setBusy(false);
    }
  }

  if (revealed) {
    return (
      <Modal isOpen onClose={onClose} title="API key created — copy it now">
        <div className="space-y-3 text-xs">
          <p className="text-[var(--text-dim)]">
            The raw key is shown <strong className="text-[var(--text)]">once</strong>. Store it
            somewhere safe — we only keep the hash.
          </p>
          <div className="rounded border border-[var(--rail)] bg-[var(--surface-2)] p-3 font-mono break-all">
            {revealed.key}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Email API Key">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--text-dim)] mb-1">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Production" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">Daily limit</label>
            <Input value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} type="number" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-dim)] mb-1">Monthly limit</label>
            <Input value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} type="number" />
          </div>
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" size="sm" loading={busy} disabled={!name.trim()}>Create API Key</Button>
        </div>
      </form>
    </Modal>
  );
}
