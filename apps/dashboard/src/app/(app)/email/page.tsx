'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';
import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { useEmailProjects } from './use-email-projects';
import { CreateDomainModal } from './create-domain-modal';
import { DomainCard } from './domain-card';
import { EmailProjectSelector } from './email-project-selector';

export default function EmailPage() {
  const { getSdk } = useAuth();
  const shellProjectId = useShellProjectId();
  const sdk = getSdk();
  const { projects, pickedProjectId, setPickedProjectId, loading: loadingProjects } =
    useEmailProjects(sdk, shellProjectId);
  const selectedProjectId = shellProjectId ?? pickedProjectId;
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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
        <EmailProjectSelector
          projects={projects}
          pickedProjectId={pickedProjectId}
          onPick={setPickedProjectId}
        />
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
