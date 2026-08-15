'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { FidscriptSDK, Mailbox } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';
import { saveCatchAll } from './catchall-hooks';

type TargetType = 'mailbox' | 'external' | 'webhook';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  domainId: string;
  projectId: string;
  initialRule?: { target: { type: string; mailboxId?: string; address?: string; url?: string } } | null;
  mailboxes: Mailbox[];
  onSave: () => void;
  getSdk: () => FidscriptSDK;
}

export function CatchAllConfigModal({ isOpen, onClose, domainId, projectId, initialRule, mailboxes, onSave, getSdk }: Props) {
  const initialType: TargetType =
    initialRule?.target.type === 'mailbox' || initialRule?.target.type === 'webhook'
      ? initialRule.target.type
      : 'external';
  const [targetType, setTargetType] = useState<TargetType>(initialType);
  const [mailboxId, setMailboxId] = useState(initialRule?.target.mailboxId ?? '');
  const [external, setExternal] = useState(initialRule?.target.address ?? '');
  const [webhookUrl, setWebhookUrl] = useState(initialRule?.target.url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (targetType === 'mailbox' && !mailboxId) return;
    if (targetType === 'external' && !external.trim()) return;
    if (targetType === 'webhook' && !webhookUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sdk = getSdk();
      const target =
        targetType === 'mailbox'
          ? { type: 'mailbox' as const, mailboxId }
          : targetType === 'external'
          ? { type: 'external' as const, address: external.trim() }
          : { type: 'webhook' as const, url: webhookUrl.trim() };
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
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetType(e.target.value as TargetType)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="mailbox">Internal Mailbox</option>
            <option value="external">External Email Address</option>
            <option value="webhook">Webhook URL</option>
          </select>
        </div>
        {targetType === 'mailbox' ? (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Mailbox</label>
            <select
              value={mailboxId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setMailboxId(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Select mailbox...</option>
              {mailboxes.map(mb => (
                <option key={mb.id} value={mb.id}>{mb.email}</option>
              ))}
            </select>
          </div>
        ) : targetType === 'external' ? (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">External address</label>
            <Input
              value={external}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExternal(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Webhook URL</label>
            <Input
              value={webhookUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/inbound"
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
