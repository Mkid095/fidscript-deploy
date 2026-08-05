'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import { API_BASE_URL } from '@/lib/sdk';
import { Button, EmptyState, Spinner, Toast } from '@fidscript/ui';
import { IdentityCard } from './identity-card';
import { AddIdentityModal, type SenderIdentity } from './add-identity-modal';

type Flash = { type: 'success' | 'error'; message: string };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function IdentitiesTab() {
  const { getToken } = useAuth();
  const projectId = useShellProjectId();
  const [identities, setIdentities] = useState<SenderIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/sender-identities`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as SenderIdentity[];
      setIdentities(list);
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [getToken, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string) {
    if (!projectId) return;
    setBusyId(id);
    try {
      const token = getToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/email/sender-identities/${id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIdentities(prev => prev.filter(i => i.id !== id));
      setFlash({ type: 'success', message: 'Identity removed' });
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
          {loading ? 'Loading…' : `${identities.length} identit${identities.length !== 1 ? 'ies' : 'y'}`}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Identity</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : identities.length === 0 ? (
        <EmptyState
          title="No sender identities"
          description="Add a sender identity on an ACTIVE domain so your transactional mail has a clear From header."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {identities.map(i => (
            <IdentityCard
              key={i.id}
              identity={i}
              busy={busyId === i.id}
              onDelete={() => handleDelete(i.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddIdentityModal
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setIdentities(prev => [...prev, created]);
            setShowAdd(false);
            setFlash({ type: 'success', message: 'Identity created' });
          }}
        />
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
