'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft01Icon,
  Search01Icon,
  Mail01Icon,
  SentIcon,
  Delete01Icon,
  StarIcon,
  StarOffIcon,
  Refresh01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';
import type { MailboxMessage } from '@fidscript/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

type Folder = 'inbox' | 'sent' | 'trash';

// Universal status colors per ADR-036. Green=read/healthy, blue=info, yellow=warning.
const STATUS_PALETTE: Record<string, string> = {
  // MailboxMessage.status (EmailStatus enum from Prisma)
  QUEUED: 'bg-yellow-900/30 text-[var(--warning)] border-yellow-800/60',
  SUBMITTED: 'bg-[var(--accent)]/10 text-[var(--accent)] border-blue-800/60',
  ACCEPTED: 'bg-emerald-900/30 text-[var(--success)] border-[var(--success)]/30/60',
  DELIVERED: 'bg-emerald-900/30 text-[var(--success)] border-[var(--success)]/30/60',
  BOUNCED: 'bg-red-900/30 text-[var(--danger)] border-[var(--danger)]/30/60',
  FAILED: 'bg-red-900/30 text-[var(--danger)] border-[var(--danger)]/30/60',
};

export default function MailboxPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const params = useParams();
  // projectId comes from the shell context (project-level route), not the email domain UUID
  const projectId = shellProjectId ?? '';
  const mailboxId = params.mailbox as string;

  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Selected message (for the right-panel preview — ADR-036 principle 12).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = messages.find(m => m.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const list = await sdk.email.listMessages(projectId, {
        mailboxId,
        folder: folder === 'trash' ? undefined : folder,
        unread: folder === 'inbox' ? undefined : undefined,
        limit: 100,
      });
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId, mailboxId, folder]);

  useEffect(() => { load(); }, [load]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const sdk = getSdk();
      await sdk.email.send(projectId, {
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        text: composeBody.trim(),
      });
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
      setShowCompose(false);
      // refresh the sent folder if the user is viewing it
      if (folder === 'sent') await load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  }

  async function toggleRead(msg: MailboxMessage) {
    try {
      const sdk = getSdk();
      await sdk.email.markMessagesRead(projectId, [msg.id], !msg.isRead);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: !m.isRead } : m));
    } catch { /* surfaced on next list */ }
  }

  async function toggleStar(msg: MailboxMessage) {
    try {
      const sdk = getSdk();
      await sdk.email.starMessage(projectId, msg.id, !msg.isStarred);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: !m.isStarred } : m));
    } catch { /* surfaced on next list */ }
  }

  async function deleteMsg(msg: MailboxMessage) {
    if (!confirm('Delete this message?')) return;
    try {
      const sdk = getSdk();
      await sdk.email.deleteMessages(projectId, [msg.id]);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      if (selectedId === msg.id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  // Search-first filter (ADR-036 principle 8)
  const filtered = messages.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.subject.toLowerCase().includes(q)
      || m.from.toLowerCase().includes(q)
      || m.to.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/email" className="text-[var(--text-muted)] hover:text-[var(--text-muted)] flex items-center gap-1 no-underline">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
          Email
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <h1 className="text-base font-semibold text-[var(--text)]">Mailbox</h1>
      </div>

      {/* Toolbar: search + refresh + compose (one hero action per ADR-036 principle 5) */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subject, from, to…"
            className="pl-9 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={load} title="Refresh">
          <HugeiconsIcon icon={Refresh01Icon} size={14} />
        </Button>
        <Button variant="primary" size="sm" onClick={() => setShowCompose(true)} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Mail01Icon} size={14} />
          Compose
        </Button>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--rail)]">
        {(['inbox', 'sent', 'trash'] as Folder[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => { setFolder(f); setSelectedId(null); }}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 capitalize ${
              folder === f
                ? 'border-[var(--warning)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg p-3 mb-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title={search ? 'No matches' : folder === 'inbox' ? 'Inbox is empty' : folder === 'sent' ? 'Nothing sent yet' : 'Trash is empty'}
            description={search ? 'Try a different search term.' : folder === 'inbox' ? 'Inbound mail will appear here.' : folder === 'sent' ? 'Mail you send from this mailbox will appear here.' : 'Deleted messages will appear here.'}
            action={folder === 'inbox' || folder === 'sent' ? (
              <Button variant="primary" size="sm" onClick={() => setShowCompose(true)} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Mail01Icon} size={14} />
                Compose
              </Button>
            ) : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          {/* List */}
          <Card className="border border-[var(--rail)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--rail)]">
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 w-8"></th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">From → To</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Subject</th>
                  <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 w-24">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(msg => (
                  <tr
                    key={msg.id}
                    onClick={() => { setSelectedId(msg.id); if (!msg.isRead) toggleRead(msg); }}
                    className={`border-b border-[var(--rail)] last:border-0 cursor-pointer hover:bg-[var(--rail)]/30 ${
                      selectedId === msg.id ? 'bg-[var(--rail)]/50' : ''
                    } ${!msg.isRead ? 'bg-blue-950/10' : ''}`}
                  >
                    <td className="px-2 py-3 text-center">
                      {msg.isStarred && <HugeiconsIcon icon={StarIcon} size={14} className="text-[var(--warning)]" />}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className={`truncate ${msg.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)] font-medium'}`}>
                        {folder === 'sent' ? `to ${msg.to}` : msg.from}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs truncate max-w-xs ${msg.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                      {msg.subject}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Right-panel preview (ADR-036 principle 12 — panels over modals) */}
          <Card className="border border-[var(--rail)] p-5">
            {selected ? (
              <MessagePreview
                message={selected}
                onToggleRead={() => toggleRead(selected)}
                onToggleStar={() => toggleStar(selected)}
                onDelete={() => deleteMsg(selected)}
              />
            ) : (
              <div className="text-center text-sm text-[var(--text-muted)] py-12">
                Select a message to preview
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Compose modal */}
      <Modal
        isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendError(null); }}
        title="Compose Email"
      >
        <form onSubmit={handleSend} noValidate>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
            <Input value={composeTo} onChange={e => setComposeTo(e.target.value)}
              placeholder="recipient@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
            <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
              placeholder="Hello"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full" />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Body</label>
            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message..." rows={6}
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          {sendError && <p className="text-[var(--danger)] text-xs mb-4">{sendError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowCompose(false); setSendError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={sending}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Message preview (right panel — ADR-036 principle 12) ── */
function MessagePreview({
  message,
  onToggleRead,
  onToggleStar,
  onDelete,
}: {
  message: MailboxMessage;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--text)] truncate">{message.subject}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            <span className="text-[var(--text-muted)]">{message.from}</span>
            {' → '}
            <span className="text-[var(--text-muted)]">{message.to}</span>
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            {new Date(message.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${STATUS_PALETTE[message.status] ?? 'bg-[var(--rail)] text-[var(--text-muted)] border-slate-600'}`}>
          {message.status.toLowerCase()}
        </span>
      </div>

      <div className="border-t border-[var(--rail)] pt-3">
        {message.textBody || message.htmlBody ? (
          message.textBody ? (
            <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{message.textBody}</p>
          ) : (
            <div
              className="text-sm text-[var(--text-muted)] [&_a]:text-[var(--accent)] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: message.htmlBody! }}
            />
          )
        ) : (
          <p className="text-sm text-[var(--text-dim)] italic">(empty message)</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--rail)]">
        <Button variant="ghost" size="sm" onClick={onToggleRead} title={message.isRead ? 'Mark unread' : 'Mark read'}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          {message.isRead ? 'Unread' : 'Read'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleStar} title={message.isStarred ? 'Unstar' : 'Star'}>
          <HugeiconsIcon icon={message.isStarred ? StarOffIcon : StarIcon} size={14} />
          {message.isStarred ? 'Unstar' : 'Star'}
        </Button>
        <div className="flex-1" />
        <Button variant="danger" size="sm" onClick={onDelete} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Delete01Icon} size={14} />
          Delete
        </Button>
      </div>
    </div>
  );
}