'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Button, Card, Spinner } from '@fidscript/ui';
import type { MailboxMessage } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { MessageList } from './message-list';
import { MessagePreview } from './message-detail';
import { ComposeModal } from './compose-modal';
import { MailboxToolbar } from './mailbox-toolbar';
import { MailboxEmptyState } from './mailbox-empty-state';

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
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: !msg.isRead } : m));
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

      <MailboxToolbar
        folder={folder}
        search={search}
        onFolderChange={f => { setFolder(f); setSelectedId(null); }}
        onSearchChange={setSearch}
        onRefresh={load}
        onCompose={() => setShowCompose(true)}
      />

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
        <MailboxEmptyState folder={folder} search={search} onCompose={() => setShowCompose(true)} />
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
