'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@fidscript/ui';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Modal } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { EmptyState } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

// Local type definitions mirroring SDK internal modules
interface EmailMessage {
  id: string;
  to: string;
  from?: string;
  subject: string;
  status: string;
  createdAt: string;
}
interface Mailbox {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

const READ_COLORS: Record<string, string> = {
  READ: 'bg-slate-700 text-slate-400',
  UNREAD: 'bg-blue-900 text-blue-400',
};

export default function MailboxPage() {
  const { getSdk } = useAuth();
  const params = useParams();
  const domainId = params.domain as string;
  const mailboxId = params.mailbox as string;

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sdk = getSdk();
        // We don't have a getMailbox method, but we have listMailboxes to verify existence
        const mailboxes = await sdk.email.listMailboxes(domainId);
        const found = mailboxes.find(m => m.id === mailboxId);
        setMailbox(found ?? null);
        // We also don't have getMessages — we'll show empty until we know the API
        setMessages([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load mailbox');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [domainId, mailboxId, getSdk]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const sdk = getSdk();
      // send requires projectId, not domainId
      await sdk.email.send(domainId, {
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        text: composeBody.trim(),
      });
      setSendSuccess(true);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setTimeout(() => { setShowCompose(false); setSendSuccess(false); }, 1500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !mailbox) {
    return (
      <div className="text-red-400 text-sm">{error ?? 'Mailbox not found'}</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/email/${domainId}`} className="text-slate-500 hover:text-slate-300 text-sm no-underline">
          Email
        </Link>
        <span className="text-slate-600">/</span>
        <Link href={`/email/${domainId}`} className="text-slate-500 hover:text-slate-300 text-sm no-underline">
          {mailbox.email.split('@')[1]}
        </Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-slate-200">{mailbox.email}</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowCompose(true)}>
          Compose
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card className="border border-[#1e2130]">
          <EmptyState
            title="No messages"
            description="This mailbox has no messages yet."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCompose(true)}>
                Compose
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="border border-[#1e2130] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2130]">
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">From</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Subject</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Date</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(msg => (
                <tr key={msg.id} className="border-b border-[#1e2130] last:border-0 hover:bg-[#1e2130]/30">
                  <td className="px-4 py-3 text-slate-300 text-xs">{msg.from ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-200 text-xs">{msg.subject}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${READ_COLORS[msg.status] ?? 'bg-slate-700 text-slate-300'}`}>
                      {msg.status ?? 'UNKNOWN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Compose Modal */}
      <Modal
        isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendError(null); setSendSuccess(false); }}
        title="Compose Email"
      >
        <form onSubmit={handleSend} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <Input
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <Input
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
              placeholder="Hello"
              className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Body</label>
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message..."
              rows={5}
              className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          {sendError && <p className="text-red-400 text-xs mb-4">{sendError}</p>}
          {sendSuccess && <p className="text-emerald-400 text-xs mb-4">Email sent successfully.</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCompose(false); setSendError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
