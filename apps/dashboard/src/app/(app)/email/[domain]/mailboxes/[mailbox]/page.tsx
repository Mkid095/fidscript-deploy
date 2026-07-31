'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Search01Icon, Mail01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { Button, Card, EmptyState, Input, Spinner } from '@fidscript/ui';
import type { MailboxMessage } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { MessageList } from './message-list';
import { MessagePreview } from './message-detail';
import { ComposeModal } from './compose-modal';

type Folder = 'inbox' | 'sent' | 'trash';

export default function MailboxPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const params = useParams();
  const projectId = shellProjectId ?? '';
  const mailboxId = params.mailbox as string;

  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = messages.find(m => m.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSdk().email.listMessages(projectId, {
        mailboxId,
        folder: folder === 'trash' ? undefined : folder,
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

  async function toggleRead(msg: MailboxMessage) {
    try {
      await getSdk().email.markMessagesRead(projectId, [msg.id], !msg.isRead);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: !m.isRead } : m));
    } catch { /* surfaced on next list */ }
  }

  async function toggleStar(msg: MailboxMessage) {
    try {
      await getSdk().email.starMessage(projectId, msg.id, !msg.isStarred);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: !msg.isStarred } : m));
    } catch { /* surfaced on next list */ }
  }

  async function deleteMsg(msg: MailboxMessage) {
    if (!confirm('Delete this message?')) return;
    try {
      await getSdk().email.deleteMessages(projectId, [msg.id]);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      if (selectedId === msg.id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

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

      {/* Toolbar */}
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
          <MessageList
            folder={folder}
            filtered={filtered}
            selectedId={selectedId}
            onSelect={msg => { setSelectedId(msg.id); if (!msg.isRead) toggleRead(msg); }}
          />
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

      {showCompose && (
        <ComposeModal
          projectId={projectId}
          getSdk={getSdk}
          folder={folder}
          onSent={load}
          onClose={() => setShowCompose(false)}
        />
      )}
    </div>
  );
}
