'use client';

import { useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';
import { saveCatchAll } from './catchall-hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  projectId: string;
  initialRule?: { target: { type: string; mailboxId?: string; address?: string } } | null;
  mailboxes: Mailbox[];
  onSave: () => void;
  getSdk: () => FidscriptSDK;
}

export function CatchAllConfigModal({ isOpen, onClose, domainId, projectId, initialRule, mailboxes, onSave, getSdk }: Props) {
  const [targetType, setTargetType] = useState<'mailbox' | 'external'>(
    initialRule?.target.type === 'mailbox' ? 'mailbox' : 'external',
  );
  const [mailboxId, setMailboxId] = useState(initialRule?.target.mailboxId ?? '');
  const [external, setExternal] = useState(initialRule?.target.address ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (targetType === 'mailbox' && !mailboxId) return;
    if (targetType === 'external' && !external.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sdk = getSdk();
      const target = targetType === 'mailbox'
        ? { type: 'mailbox' as const, mailboxId }
        : { type: 'external' as const, address: external.trim() };
      await saveCatchAll(sdk, projectId, domainId, target);
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); setError(null); }}
      title={initialRule ? 'Edit Catch-all Rule' : 'Configure Catch-all Rule'}
    >
      <form onSubmit={handleSave} noValidate>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Deliver to</label>
          <select
            value={targetType}
            onChange={e => setTargetType(e.target.value as 'mailbox' | 'external')}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="mailbox">Internal Mailbox</option>
            <option value="external">External Email Address</option>
            <option value="webhook" disabled>Webhook (not yet available)</option>
          </select>
        </div>
        {targetType === 'mailbox' ? (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Mailbox</label>
            <select
              value={mailboxId}
              onChange={e => setMailboxId(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Select mailbox...</option>
              {mailboxes.map(mb => (
                <option key={mb.id} value={mb.id}>{mb.email}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">External address</label>
            <Input
              value={external}
              onChange={e => setExternal(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
        )}
        {error && <p className="text-[var(--danger)] text-xs mb-4">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={() => { onClose(); setError(null); }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" loading={saving}>
            {saving ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
