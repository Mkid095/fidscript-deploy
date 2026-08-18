'use client';

import { useState } from 'react';
import { Button, Spinner } from '@fidscript/ui';
import { ExpirySelector } from './ai-expiry-selector';
import type { ExpiryOption } from '@/hooks/use-account-credentials';

interface Props {
  onCreate: (name: string) => Promise<void>;
  loading?: boolean;
  localError?: string | null;
}

export function AiKeyCreateForm({ onCreate, loading, localError }: Props) {
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>('30d');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex items-start gap-3">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="Key name (e.g. Claude Desktop)" maxLength={100}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--rail)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)]" />
      <ExpirySelector value={expiry} onChange={setExpiry} />
      <Button type="submit" variant="primary" size="sm" disabled={!name.trim() || creating}>
        {creating ? <><Spinner size="sm" /> Creating…</> : <>Generate</>}
      </Button>
    </form>
  );
}
