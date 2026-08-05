'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Mailbox } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import {
  Button, EmptyState, Spinner, Toast,
} from '@fidscript/ui';
import { MailboxCard } from './mailbox-card';
import { AddMailboxModal } from './add-mailbox-modal';

type Flash = { type: 'success' | 'error'; message: string };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function MailboxesTab() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().email.listMailboxes(projectId);
      setMailboxes(list);
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string) {
    if (!projectId) return;
    setBusyId(id);
    try {
      await getSdk().email.deleteMailbox(projectId, id);
      setMailboxes(prev => prev.filter(m => m.id !== id));
      setFlash({ type: 'success', message: 'Mailbox removed' });
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setBusyId(null);
    }
  }

  if (!projectId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {loading ? 'Loading…' : `${mailboxes.length} mailbox${mailboxes.length !== 1 ? 'es' : ''}`}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Mailbox</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : mailboxes.length === 0 ? (
        <EmptyState
          title="No mailboxes yet"
          description="Add a mailbox under one of your verified domains to start receiving mail."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mailboxes.map(m => (
            <MailboxCard
              key={m.id}
              mailbox={m}
              busy={busyId === m.id}
              onDelete={() => handleDelete(m.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddMailboxModal
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setMailboxes(prev => [...prev, created]);
          }}
        />
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
