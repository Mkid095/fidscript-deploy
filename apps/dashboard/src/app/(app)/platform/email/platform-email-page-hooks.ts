import { useCallback, useEffect, useState } from 'react';
import type { PlatformMailboxMessage, PlatformMailboxSummary } from '@fidscript-deploy/sdk';
import type { Folder } from './platform-email-page-types';

export function useEmailPage(sdk: ReturnType<ReturnType<typeof import('@/contexts/auth-context').useAuth>['getSdk']>) {
  const [mailboxes, setMailboxes] = useState<PlatformMailboxSummary[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string>('');
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<PlatformMailboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<PlatformMailboxMessage | null>(null);
  const [loadingMailboxes, setLoadingMailboxes] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const openMessage = useCallback(async (msg: PlatformMailboxMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isRead: true }); } catch {}
    }
    try {
      const full = await sdk.email.admin.getMessage(msg.mailbox, msg.id);
      setSelectedMessage(full);
    } catch {}
  }, [sdk]);

  const starMessage = useCallback(async (msg: PlatformMailboxMessage) => {
    const ns = !msg.isStarred;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: ns } : m));
    if (selectedMessage?.id === msg.id) setSelectedMessage(prev => prev ? { ...prev, isStarred: ns } : prev);
    try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { isStarred: ns }); } catch {}
  }, [sdk, selectedMessage]);

  const moveMessage = useCallback(async (msg: PlatformMailboxMessage, folder: Folder) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try { await sdk.email.admin.patchMessage(msg.mailbox, msg.id, { moveTo: folder as 'archive' | 'inbox' | 'trash' | 'junk' }); } catch {}
  }, [sdk, selectedMessage]);

  const deleteMessage = useCallback(async (msg: PlatformMailboxMessage) => {
    if (!confirm(`Delete "${msg.subject}"? This cannot be undone.`)) return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    if (selectedMessage?.id === msg.id) setSelectedMessage(null);
    try { await sdk.email.admin.deleteMessage(msg.mailbox, msg.id); } catch {}
  }, [sdk, selectedMessage]);

  const handleCreateMailbox = useCallback(async (local: string, display?: string) => {
    const data = await sdk.email.admin.create({ localPart: local, displayName: display });
    setCreateResult({ email: data.mailbox.email, password: data.password });
    await loadMailboxes();
    if (data.mailbox?.name) setSelectedLocal(data.mailbox.name);
    return data;
  }, [sdk, loadMailboxes]);

  return {
    mailboxes, setMailboxes,
    selectedLocal, setSelectedLocal,
    activeFolder, setActiveFolder,
    messages, total,
    selectedMessage, setSelectedMessage,
    loadingMailboxes, loadingMessages,
    error, setError,
    createResult, setCreateResult,
    sendResult, setSendResult,
    loadMailboxes, loadMessages,
    openMessage, starMessage, moveMessage, deleteMessage,
    handleCreateMailbox,
  };
}
