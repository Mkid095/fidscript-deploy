'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { Button, Input, Modal } from '@fidscript/ui';

const ALL_EVENTS = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'];

interface CreateWebhookModalProps {
  projectId: string;
  getSdk: () => FidscriptSDK;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWebhookModal({ projectId, getSdk, onClose, onCreated }: CreateWebhookModalProps) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['delivered', 'bounced']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(ev: string) {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || events.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await getSdk().email.createWebhook(projectId, { url: url.trim(), events });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Add Email Webhook">
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Webhook URL *</label>
          <Input type="url" value={url} onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            placeholder="https://your-app.com/hooks/email"
            className="bg-[var(--surface-2)] border border-[var(--rail)] w-full" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-2">Events to subscribe</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_EVENTS.map(ev => (
              <label key={ev} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} className="accent-[var(--accent)]" />
                <span className="text-sm text-[var(--text)]">{ev}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs text-[var(--accent)]">
          Webhooks are signed with HMAC-SHA256. The signature is sent in the <code className="font-mono">X-FIDScript-Signature</code> header.
        </div>
        {error && <p className="text-[var(--danger)] text-xs">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={saving}>
            {saving ? 'Creating...' : 'Create Webhook'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
