'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { ProjectEmailCard } from './project-email-card';

export default function ProjectEmailPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const projectId = shellProjectId!;

  useEffect(() => {
    if (!projectId) return;
    async function loadDomains() {
      setLoadingDomains(true);
      setError(null);
      try {
        const sdk = getSdk();
        const list = await sdk.email.listDomains(projectId);
        setDomains(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domains');
      } finally {
        setLoadingDomains(false);
      }
    }
    loadDomains();
  }, [projectId, getSdk]);

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const sdk = getSdk();
      const created = await sdk.email.createDomain(projectId, newDomain.trim());
      setDomains(prev => [...prev, created as EmailDomain]);
      setNewDomain('');
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email Domains</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {domains.length} domain{domains.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          Add Domain
        </Button>
      </div>

      {error && <p className="text-[var(--danger)] mb-4 text-sm">{error}</p>}

      {loadingDomains ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No email domains"
            description="Add a domain to start managing email for this project."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
                Add Domain
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {domains.map(domain => (
            <ProjectEmailCard key={domain.id} domain={domain} />
          ))}
        </div>
      )}

      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setNewDomain(''); setAddError(null); }}
        title="Add Domain"
      >
        <form onSubmit={handleAddDomain} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Domain name</label>
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="mail.example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>
          {addError && <p className="text-[var(--danger)] text-xs mb-4">{addError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { setShowAdd(false); setAddError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={adding}>
              {adding ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}