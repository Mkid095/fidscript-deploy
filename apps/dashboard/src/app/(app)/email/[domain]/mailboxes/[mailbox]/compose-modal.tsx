'use client';

import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { useState } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';

interface ComposeModalProps {
  projectId: string;
  getSdk: () => FidscriptSDK;
  folder: string;
  onSent: () => void;
  onClose: () => void;
}

export function ComposeModal({ projectId, getSdk, folder, onSent, onClose }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await getSdk().email.send(projectId, {
        to: to.trim(),
        subject: subject.trim(),
        text: body.trim(),
      });
      setTo(''); setSubject(''); setBody('');
      if (folder === 'sent') onSent();
      onClose();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Compose Email">
      <form onSubmit={handleSend} noValidate>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
          <Input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Hello"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message..." rows={6}
            className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        {sendError && <p className="text-[var(--danger)] text-xs mb-4">{sendError}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={sending}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
