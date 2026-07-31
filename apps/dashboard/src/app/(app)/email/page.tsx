'use client';

import type { EmailDomain } from '@fidscript-deploy/sdk';
import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Spinner } from '@fidscript/ui';
import Link from 'next/link';

import type { Project } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { CreateDomainModal } from './create-domain-modal';

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-[var(--rail)] text-[var(--text-muted)]',
  VERIFIED: 'bg-blue-900 text-[var(--accent)]',
  ACTIVE:   'bg-emerald-900 text-[var(--success)]',
  FAILED:   'bg-red-900 text-[var(--danger)]',
};

const VERIFY_COLORS: Record<string, string> = {
  true:  'bg-emerald-900 text-[var(--success)]',
  false: 'bg-[var(--rail)] text-[var(--text-muted)]',
};

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
          <p className="text-sm text-[var(--text-muted)]">
            {domains.length} domain{domains.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          Add Domain
        </Button>
      </div>

      {/* Project selector — hidden when the project shell already chose a project */}
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
            <Link key={domain.id} href={`/email/${domain.id}`} className="no-underline">
              <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-5 cursor-pointer transition-colors duration-150 hover:border-[var(--accent)]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)] mb-0.5">{domain.domain}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{domain.id.slice(0, 12)}…</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[domain.status ?? 'UNKNOWN'] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                    {domain.status ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['dkim', 'spf', 'dmarc', 'mx'] as const).map((rec) => (
                    <span key={rec} className="flex items-center gap-1">
                      <span className="text-xs text-[var(--text-muted)] capitalize">{rec}:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${VERIFY_COLORS[String(domain[`${rec}Verified`])]}`}>
                        {domain[`${rec}Verified`] ? '✓' : '✗'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </Link>
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
