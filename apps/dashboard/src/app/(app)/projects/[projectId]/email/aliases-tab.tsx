'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EmailAlias } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import {
  Button, EmptyState, Spinner, Toast,
} from '@fidscript/ui';
import { AliasCard } from './alias-card';
import { AddAliasModal } from './add-alias-modal';

type Flash = { type: 'success' | 'error'; message: string };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function AliasesTab() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().email.listAliases(projectId);
      setAliases(list);
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
      await getSdk().email.deleteAlias(projectId, id);
      setAliases(prev => prev.filter(a => a.id !== id));
      setFlash({ type: 'success', message: 'Alias removed' });
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
          {loading ? 'Loading…' : `${aliases.length} alias${aliases.length !== 1 ? 'es' : ''}`}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Alias</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : aliases.length === 0 ? (
        <EmptyState
          title="No aliases yet"
          description="Forward mailboxes like hello@ or support@ to one of your mailboxes or an external address."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {aliases.map(a => (
            <AliasCard
              key={a.id}
              alias={a}
              busy={busyId === a.id}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddAliasModal
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setAliases(prev => [...prev, created]);
            setShowAdd(false);
          }}
        />
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
