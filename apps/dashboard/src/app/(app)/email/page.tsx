'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';
import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { CreateDomainModal } from './create-domain-modal';
import { DomainCard } from './domain-card';

export default function EmailPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(!shellProjectId);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (shellProjectId) return;
    async function load() {
      try {
        const sdk = getSdk();
        const data = await sdk.projects.list();
        setProjects(data.projects ?? []);
        if ((data.projects ?? []).length > 0 && !pickedProjectId) {
          setPickedProjectId((data.projects ?? [])[0].id);
        }
      } catch { /* ignore */ }
      finally { setLoadingProjects(false); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSdk, shellProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadDomains() {
      setLoadingDomains(true);
      setError(null);
      try {
        const list = await getSdk().email.listDomains(selectedProjectId);
        setDomains(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load domains');
      } finally {
        setLoadingDomains(false);
      }
    }
    loadDomains();
  }, [selectedProjectId, getSdk]);

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Email</h1>
          <p className="text-sm text-[var(--text-muted)]">{domains.length} domain{domains.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>Add Domain</Button>
      </div>

      {!shellProjectId && (
        <div className="mb-6">
          <label className="block text-xs text-[var(--text-muted)] mb-1">Project</label>
          <select
            value={pickedProjectId}
            onChange={e => setPickedProjectId(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm min-w-52"
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

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
            action={<Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>Add Domain</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {domains.map(domain => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      )}

      {showAdd && (
        <CreateDomainModal
          projectId={selectedProjectId}
          getSdk={getSdk}
          onCreated={d => setDomains(prev => [...prev, d])}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
