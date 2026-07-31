'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@fidscript/ui';
import type { PlatformMailboxMessage, PlatformMailboxSummary } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { PlatformEmailTopbar } from './platform-email-topbar';
import { PlatformEmailCreateMailboxModal } from './platform-email-create-mailbox-modal';
import { PlatformEmailComposeModal } from './platform-email-compose-modal';
import { PlatformEmailMailboxCreatedCard } from './platform-email-mailbox-created-card';
import { sendPlatformMail } from './platform-email-send-mail';
import { PlatformEmailThreePanel } from './platform-email-three-panel';

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
    if (selectedMessage?.id === msg.id) setSelectedMessage((prev: PlatformMailboxMessage | null) => prev ? { ...prev, isStarred: ns } : prev);
    try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isStarred: ns }); } catch {}
  }

  async function moveMessage(msg: PlatformMailboxMessage, folder: Folder) {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { moveTo: folder as 'archive' | 'inbox' | 'trash' | 'junk' }); } catch {}
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

  if (loadingMailboxes) return (
    <div className="flex items-center justify-center min-h-96"><Spinner size="lg" /></div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <PlatformEmailTopbar mailboxes={mailboxes} onCompose={() => setShowCompose(true)} onNewMailbox={() => setShowCreate(true)} />

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}
      {sendResult && <p className="text-[var(--success)] mb-4 text-sm">{sendResult}</p>}

      <PlatformEmailThreePanel
        mailboxes={mailboxes}
        selectedLocal={selectedLocal}
        messages={messages}
        total={total}
        activeFolder={activeFolder}
        selectedMessage={selectedMessage}
        loadingMessages={loadingMessages}
        onSelectMailbox={name => { setSelectedLocal(name); setSelectedMessage(null); }}
        onSelectMessage={openMessage}
        onStar={starMessage}
        onMove={(msg, folder) => moveMessage(msg, folder as Folder)}
        onDelete={deleteMessage}
      />

      <PlatformEmailCreateMailboxModal isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateResult(null); }}
        onCreated={(email, password) => setCreateResult({ email, password })}
        onCreate={handleCreateMailbox} />

      {createResult && (
        <PlatformEmailMailboxCreatedCard email={createResult.email} password={createResult.password}
          onDone={() => setCreateResult(null)} />
      )}

      <PlatformEmailComposeModal isOpen={showCompose}
        onClose={() => { setShowCompose(false); setSendResult(null); }}
        selectedLocal={selectedLocal} onSent={() => loadMessages()}
        sendMail={opts => sendPlatformMail(sdk, opts, () => loadMessages(), setSendResult, setActiveFolder as (folder: string) => void)} />
    </div>
  );
}
