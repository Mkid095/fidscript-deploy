'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';
import { createMailbox, type MailboxFormState } from './mailbox-hooks';

interface Props {
  isOpen: boolean;
  domainName: string;
  projectId: string | undefined;
  getSdk: () => FidscriptSDK;
  onClose: () => void;
  onCreated: (mailbox: Mailbox) => void;
}

export function MailboxCreateModal({ isOpen, domainName, projectId, getSdk, onClose, onCreated }: Props) {
  const [form, setForm] = useState<MailboxFormState>({
    localPart: '',
    displayName: '',
    error: null,
    loading: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.localPart.trim()) return;
    if (!projectId) {
      setForm(f => ({ ...f, error: 'Missing project context — cannot create mailbox' }));
      return;
    }

    setForm(f => ({ ...f, loading: true, error: null }));
    try {
      const created = await createMailbox(getSdk(), projectId, domainName, form.localPart, form.displayName);
      onCreated(created);
      setForm({ localPart: '', displayName: '', error: null, loading: false });
      onClose();
    } catch (err) {
      setForm(f => ({
        ...f,
        error: err instanceof Error ? err.message : 'Failed to create mailbox',
        loading: false,
      }));
    }
  }

  function handleClose() {
    setForm({ localPart: '', displayName: '', error: null, loading: false });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Mailbox">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Local part <span className="text-[var(--text-dim)]">@{domainName}</span>
          </label>
          <Input
            value={form.localPart}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, localPart: e.target.value }))}
            placeholder="alice"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Display name (optional)</label>
          <Input
            value={form.displayName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Alice Smith"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        {form.error && <p className="text-[var(--danger)] text-xs mb-4">{form.error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={form.loading}>
            {form.loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
