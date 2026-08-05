'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MailboxMessage } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import {
  Button, EmptyState, Spinner, Toast,
} from '@fidscript/ui';
import { MessageRow } from './message-row';

type Flash = { type: 'success' | 'error'; message: string };
type FolderFilter = 'all' | 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function MessagesTab() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [folder, setFolder] = useState<FolderFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = folder === 'all' ? {} : { folder };
      const list = await getSdk().email.listMessages(projectId, params);
      setMessages(list);
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId, folder]);

  useEffect(() => { void load(); }, [load]);

  async function toggleStar(m: MailboxMessage) {
    if (!projectId) return;
    setBusyId(m.id);
    try {
      const updated = await getSdk().email.starMessage(projectId, m.id, !m.isStarred);
      setMessages(prev => prev.map(x => (x.id === m.id ? updated : x)));
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleRead(m: MailboxMessage) {
    if (!projectId) return;
    setBusyId(m.id);
    try {
      await getSdk().email.markMessagesRead(projectId, [m.id], !m.isRead);
      setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, isRead: !m.isRead } : x)));
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!projectId) return;
    setBusyId(id);
    try {
      await getSdk().email.deleteMessages(projectId, [id]);
      setMessages(prev => prev.filter(m => m.id !== id));
      setFlash({ type: 'success', message: 'Message deleted' });
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setBusyId(null);
    }
  }

  if (!projectId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-dim)]">
          {loading ? 'Loading…' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-1">
          {(['all', 'inbox', 'sent', 'drafts', 'trash', 'spam'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={folder === f ? 'primary' : 'ghost'}
              onClick={() => setFolder(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages"
          description="Sent and received mail for this project will appear here."
        />
      ) : (
        <div className="rounded-lg border border-[var(--rail)] divide-y divide-[var(--rail)]">
          {messages.map(m => (
            <MessageRow
              key={m.id}
              message={m}
              busy={busyId === m.id}
              onToggleStar={() => toggleStar(m)}
              onToggleRead={() => toggleRead(m)}
              onDelete={() => handleDelete(m.id)}
            />
          ))}
        </div>
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
