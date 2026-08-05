'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EmailDomain } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';

import {
  Button, EmptyState, Spinner, Toast,
} from '@fidscript/ui';
import { DomainCard } from './domain-card';
import { AddDomainModal } from './add-domain-modal';

type Flash = { type: 'success' | 'error'; message: string };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function DomainsTab() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await getSdk().email.listDomains(projectId);
      setDomains(list);
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string) {
    if (!projectId) return;
    try {
      await getSdk().email.deleteDomain(projectId, id);
      setDomains(prev => prev.filter(d => d.id !== id));
      setFlash({ type: 'success', message: 'Domain removed' });
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    }
  }

  async function handleVerify(id: string) {
    if (!projectId) return;
    try {
      const updated = await getSdk().email.verifyDomain(projectId, id);
      setDomains(prev => prev.map(d => (d.id === id ? { ...d, ...updated } : d)));
      setFlash({ type: 'success', message: 'Re-verified (DNS may take a minute to propagate)' });
    } catch (err) {
      setFlash({ type: 'error', message: errMsg(err) });
    }
  }

  if (!projectId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {loading ? 'Loading…' : `${domains.length} domain${domains.length !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Domain</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : domains.length === 0 ? (
        <EmptyState
          title="No email domains yet"
          description="Add a domain to start sending and receiving mail for this project."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {domains.map(d => (
            <DomainCard
              key={d.id}
              domain={d}
              onDelete={() => handleDelete(d.id)}
              onVerify={() => handleVerify(d.id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddDomainModal
          onClose={() => setShowAdd(false)}
          onAdded={(created) => {
            setDomains(prev => [...prev, created]);
            setShowAdd(false);
            setFlash({ type: 'success', message: 'Domain added — verify DNS to activate' });
          }}
        />
      )}

      {flash && <Toast type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
    </div>
  );
}
