'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from '@fidscript/ui';
import type { PlatformMailboxMessage, PlatformMailboxSummary, StorageBackend } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { PlatformEmailCreateMailboxModal } from './platform-email-create-mailbox-modal';
import { PlatformEmailComposeModal } from './platform-email-compose-modal';
import { PlatformEmailMessageDetail } from './platform-email-message-detail';
import { PlatformEmailMessageList } from './platform-email-message-list';
import { PlatformEmailMailboxCreatedCard } from './platform-email-mailbox-created-card';
import { PlatformEmailMailboxList } from './platform-email-mailbox-list';

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';

export default function PlatformEmailPage() {
  const sdk = useAuth().getSdk();
  const [mailboxes, setMailboxes] = useState<PlatformMailboxSummary[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string>('');
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<PlatformMailboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<PlatformMailboxMessage | null>(null);
  const [loadingMailboxes, setLoadingMailboxes] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [createResult, setCreateResult] = useState<{ email: string; password: string } | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const loadMailboxes = useCallback(async () => {
    setLoadingMailboxes(true);
    setError(null);
    try {
      const data = await sdk.email.admin.list();
      setMailboxes(data.mailboxes ?? []);
      if (!selectedLocal && data.mailboxes?.length) setSelectedLocal(data.mailboxes[0].name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mailboxes');
    } finally {
      setLoadingMailboxes(false);
    }
  }, [sdk, selectedLocal]);

  const loadMessages = useCallback(async () => {
    if (!selectedLocal) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await sdk.email.admin.listMessages(selectedLocal, { folder: activeFolder, limit: 50 });
      setMessages(data.messages ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [sdk, selectedLocal, activeFolder]);

  useEffect(() => { loadMailboxes(); }, [loadMailboxes]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    const id = setInterval(loadMessages, 5_000);
    return () => clearInterval(id);
  }, [loadMessages]);

  async function openMessage(msg: PlatformMailboxMessage) {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isRead: true }); } catch {}
    }
    try {
      const full = await sdk.email.admin.getMessage(msg.mailbox, msg.id);
      setSelectedMessage(full);
    } catch {}
  }

  async function starMessage(msg: PlatformMailboxMessage) {
    const ns = !msg.isStarred;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: ns } : m));
    if (selectedMessage?.id === msg.id) setSelectedMessage(prev => prev ? { ...prev, isStarred: ns } : prev);
    try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isStarred: ns }); } catch {}
  }

  async function moveMessage(msg: PlatformMailboxMessage, folder: Folder) {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try {
      const mt = folder as 'inbox' | 'trash' | 'junk' | 'archive';
      await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { moveTo: mt });
    } catch {}
  }

  async function deleteMessage(msg: PlatformMailboxMessage) {
    if (!confirm(`Delete "${msg.subject}"? This cannot be undone.`)) return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try { await sdk.email.admin.deleteMessage(msg.mailbox, msg.id); } catch {}
  }

  async function handleCreateMailbox(local: string, display?: string) {
    const data = await sdk.email.admin.create({ localPart: local, displayName: display });
    setCreateResult({ email: data.mailbox.email, password: data.password });
    await loadMailboxes();
    if (data.mailbox?.name) setSelectedLocal(data.mailbox.name);
    return data;
  }

  async function handleSendMail(opts: {
    fromLocal?: string;
    to: string;
    subject: string;
    text: string;
    storageBackend: StorageBackend;
    attachments?: { filename: string; mimeType: string; data: string }[];
  }) {
    await sdk.email.admin.sendMail(opts as Parameters<typeof sdk.email.admin.sendMail>[0]);
    setSendResult('Sent');
    setActiveFolder('sent');
  }

  if (loadingMailboxes) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Platform Mailboxes</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {mailboxes.length} mailbox{mailboxes.length !== 1 ? 'es' : ''} on {mailboxes[0]?.email?.split('@')[1] ?? 'platform'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowCompose(true)}>Compose</Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>New Mailbox</Button>
        </div>
      </div>

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}
      {sendResult && <p className="text-[var(--success)] mb-4 text-sm">{sendResult}</p>}

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Left: mailbox list */}
        <PlatformEmailMailboxList
          mailboxes={mailboxes}
          selectedLocal={selectedLocal}
          onSelect={name => { setSelectedLocal(name); setSelectedMessage(null); }}
        />

        {/* Center: message list */}
        <div className="w-96 flex-shrink-0 flex flex-col">
          <PlatformEmailMessageList
            messages={messages}
            total={total}
            activeFolder={activeFolder}
            selectedMessageId={selectedMessage?.id}
            loading={loadingMessages}
            onSelect={openMessage}
          />
        </div>

        {/* Right: message detail */}
        <div className="flex-1 min-w-0 flex flex-col">
          <PlatformEmailMessageDetail
            message={selectedMessage}
            onStar={starMessage}
            onMove={moveMessage}
            onDelete={deleteMessage}
          />
        </div>
      </div>

      {/* Modals */}
      <PlatformEmailCreateMailboxModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateResult(null); }}
        onCreated={(email, password) => setCreateResult({ email, password })}
        onCreate={handleCreateMailbox}
      />

      {createResult && (
        <PlatformEmailMailboxCreatedCard
          email={createResult.email}
          password={createResult.password}
          onDone={() => setCreateResult(null)}
        />
      )}

      <PlatformEmailComposeModal
        isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendResult(null); }}
        selectedLocal={selectedLocal}
        onSent={() => loadMessages()}
        sendMail={handleSendMail}
      />
    </div>
  );
}
