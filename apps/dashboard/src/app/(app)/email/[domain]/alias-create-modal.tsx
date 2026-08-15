'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';
import { createAlias, resolveAliasTargets, type AliasFormState } from './alias-hooks';

interface Props {
  isOpen: boolean;
  domainName: string;
  projectId: string | undefined;
  mailboxes: Mailbox[];
  getSdk: () => FidscriptSDK;
  onClose: () => void;
  onCreated: (alias: import('@fidscript-deploy/sdk').EmailAlias) => void;
}

export function AliasCreateModal({ isOpen, domainName, projectId, mailboxes, getSdk, onClose, onCreated }: Props) {
  const [form, setForm] = useState<AliasFormState>({
    localPart: '',
    forwardTo: '',
    error: null,
    loading: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.localPart.trim() || !form.forwardTo.trim()) return;
    if (!projectId) {
      setForm(f => ({ ...f, error: 'Missing project context — cannot create alias' }));
      return;
    }

    const forwards = form.forwardTo.split(',').map(s => s.trim()).filter(Boolean);
    const targets = resolveAliasTargets(forwards, mailboxes);

    setForm(f => ({ ...f, loading: true, error: null }));
    try {
      const created = await createAlias(getSdk(), projectId, domainName, form.localPart, targets);
      onCreated(created);
      setForm({ localPart: '', forwardTo: '', error: null, loading: false });
      onClose();
    } catch (err) {
      setForm(f => ({
        ...f,
        error: err instanceof Error ? err.message : 'Failed to create alias',
        loading: false,
      }));
    }
  }

  function handleClose() {
    setForm({ localPart: '', forwardTo: '', error: null, loading: false });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Alias">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Alias local part <span className="text-[var(--text-dim)]">@{domainName}</span>
          </label>
          <Input
            value={form.localPart}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, localPart: e.target.value }))}
            placeholder="support"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Forwards to <span className="text-[var(--text-dim)]">(comma-separated emails)</span>
          </label>
          <Input
            value={form.forwardTo}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, forwardTo: e.target.value }))}
            placeholder="alice@example.com, bob@example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        {form.error && <p className="text-[var(--danger)] text-xs mb-4">{form.error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={form.loading}>
            {form.loading ? 'Creating...' : 'Create Alias'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
