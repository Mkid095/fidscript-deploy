'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Spinner, EmptyState } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/contexts/auth-context';
import { useDeploymentsList } from './use-deployments-list';
import { DeploymentsListRow } from './deployments-list-row';

type Tab = 'active' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'all', label: 'All' },
];

const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);

export default function DeploymentsListPage() {
  const { getSdk } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = (params.projectId as string) ?? '';

  const [tab, setTab] = useState<Tab>('active');
  const { deployments, loading, error } = useDeploymentsList({ projectId, getSdk });

  const filtered = tab === 'active'
    ? deployments.filter(d => IN_FLIGHT_STATUSES.has(d.status))
    : deployments;

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">Deployments</h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} deployment${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${projectId}/services/new`)}>
          <HugeiconsIcon icon={Add01Icon} size={13} />
          New deployment
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--rail)]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Card className="border-[var(--danger)] py-3 px-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No active deployments' : 'No deployments yet'}
          description={tab === 'active'
            ? 'All deployments have reached a terminal state.'
            : 'Create your first deployment to get started.'}
          action={
            tab === 'all' ? (
              <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${projectId}/services/new`)}>
                <HugeiconsIcon icon={Add01Icon} size={13} /> New deployment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="border border-[var(--rail)]" padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)]">
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Branch</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Commit</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden lg:table-cell">Image</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Created</th>
                <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 hidden md:table-cell">Duration</th>
                <th className="text-right text-xs text-[var(--text-muted)] font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <DeploymentsListRow key={d.id} deployment={d} projectId={projectId} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
