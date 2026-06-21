'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Spinner, EmptyState, Button } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';
import { NewDeploymentModal } from '@/components/deployments/new-deployment-modal';

interface Props { project: Project }

type Tab = 'active' | 'all';
type InFlightStatus = 'PENDING' | 'QUEUED' | 'BUILDING' | 'DEPLOYING';

const IN_FLIGHT: InFlightStatus[] = ['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'];

function statusColor(status: string | undefined) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':    return 'bg-emerald-900/60 text-emerald-400 border border-emerald-800';
    case 'FAILED':     return 'bg-red-900/60 text-red-400 border border-red-800';
    case 'PENDING':
    case 'QUEUED':     return 'bg-blue-900/60 text-blue-400 border border-blue-800';
    case 'BUILDING':
    case 'DEPLOYING':  return 'bg-amber-900/60 text-amber-400 border border-amber-800';
    case 'STOPPED':     return 'bg-slate-800 text-slate-400 border border-slate-700';
    case 'ROLLED_BACK': return 'bg-purple-900/60 text-purple-400 border border-purple-800';
    case 'BLOCKED':     return 'bg-orange-900/60 text-orange-400 border border-orange-800';
    default:            return 'bg-slate-800 text-slate-400 border border-slate-700';
  }
}

function isInFlight(status: string | undefined): boolean {
  return IN_FLIGHT.includes((status?.toUpperCase() ?? '') as InFlightStatus);
}

function DeploymentCard({ deployment, projectId }: { deployment: Deployment; projectId: string }) {
  const { getSdk } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const inFlight = isInFlight(deployment.status);

  async function handleAction(action: string) {
    setActing(action);
    setShowMenu(false);
    try {
      const sdk = getSdk();
      if (action === 'stop')    await sdk.deployments.stop(projectId, deployment.id);
      if (action === 'restart') await sdk.deployments.restart(projectId, deployment.id);
      if (action === 'delete')  await sdk.deployments.destroy(projectId, deployment.id);
    } finally {
      setActing(null);
    }
  }

  const duration = deployment.completedAt
    ? Math.round((new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime()) / 1000)
    : null;

  return (
    <Card className="border border-[#1e2130] py-3 px-4 hover:border-[#2a2d3a] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${statusColor(deployment.status)}`}>
              {deployment.status?.toLowerCase()}
            </span>
            {acting && <Spinner size="sm" />}
          </div>
          <p className="text-xs text-slate-500">
            {new Date(deployment.createdAt).toLocaleString()}
            {duration !== null && ` · ${duration}s`}
          </p>
          {deployment.deploymentUrl && (
            <a
              href={deployment.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-400 mt-1 block truncate"
            >
              {deployment.deploymentUrl}
            </a>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={`/projects/${projectId}/deployments/${deployment.id}`}
            className="text-xs px-2 py-1 rounded bg-[#1e2130] text-slate-400 hover:text-slate-200 border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
          >
            Logs
          </a>

          {inFlight && (
            <button
              onClick={() => handleAction('stop')}
              disabled={!!acting}
              className="text-xs px-2 py-1 rounded bg-[#1e2130] text-slate-400 hover:text-slate-200 border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors disabled:opacity-50"
            >
              Stop
            </button>
          )}

          {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
            <button
              onClick={() => handleAction('restart')}
              disabled={!!acting}
              className="text-xs px-2 py-1 rounded bg-[#1e2130] text-slate-400 hover:text-slate-200 border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors disabled:opacity-50"
            >
              Restart
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(s => !s)}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 hover:bg-[#1e2130] transition-colors"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-[#0f1117] border border-[#1e2130] rounded-md shadow-xl z-20">
                {(deployment.status === 'SUCCESS' || deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
                  <button
                    onClick={() => { setShowMenu(false); handleAction('delete'); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#1e2130] transition-colors"
                  >
                    Delete
                  </button>
                )}
                <a
                  href={`/projects/${projectId}/deployments/${deployment.id}`}
                  className="block px-3 py-2 text-xs text-slate-400 hover:bg-[#1e2130] transition-colors"
                >
                  View detail
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DeploymentsSection({ project }: Props) {
  const { getSdk } = useAuth();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'active';

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Inline git URL paste (empty state).
  const [inlineUrl, setInlineUrl] = useState('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(project.id, { limit: 50 });
      setDeployments(Array.isArray(data) ? data.deployments ?? data : (data as any).deployments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk]);

  useEffect(() => { load(); }, [load]);

  async function handleInlineDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineUrl.trim()) return;
    setInlineSubmitting(true);
    try {
      const sdk = getSdk();
      await sdk.deployments.create(project.id, {
        source: { type: 'git', git: { url: inlineUrl.trim() } },
      });
      setInlineUrl('');
      await load();
    } finally {
      setInlineSubmitting(false);
    }
  }

  const activeDeployments = deployments.filter(d => isInFlight(d.status));
  const displayDeployments = tab === 'active' ? activeDeployments : deployments;

  if (loading) return <Spinner size="md" />;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Tab bar + New button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[#0f1117] border border-[#1e2130] rounded-lg p-0.5">
          {(['active', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => {}}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === t
                  ? 'bg-[#1e2130] text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'active' ? `Active${activeDeployments.length ? ` (${activeDeployments.length})` : ''}` : 'All'}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
          New Deployment
        </Button>
      </div>

      {/* Inline git-paste empty state */}
      {deployments.length === 0 && tab === 'active' && (
        <Card className="border border-[#1e2130] py-6 px-4">
          <p className="text-sm text-slate-400 mb-3">Paste a Git URL to deploy your first release.</p>
          <form onSubmit={handleInlineDeploy} className="flex gap-2">
            <input
              value={inlineUrl}
              onChange={e => setInlineUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="flex-1 px-3 py-2 rounded-lg bg-[#080a0d] border border-[#1e2130] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
            />
            <Button type="submit" variant="primary" size="sm" loading={inlineSubmitting} disabled={!inlineUrl.trim()}>
              Deploy
            </Button>
          </form>
        </Card>
      )}

      {/* Deployment list */}
      {displayDeployments.length === 0 && tab === 'all' && (
        <p className="text-sm text-slate-500">No deployments yet.</p>
      )}

      {displayDeployments.length > 0 && (
        <div className="flex flex-col gap-2">
          {displayDeployments.map(d => (
            <DeploymentCard key={d.id} deployment={d} projectId={project.id} />
          ))}
        </div>
      )}

      {/* New deployment modal */}
      {showNewModal && (
        <NewDeploymentModal
          project={project}
          onClose={() => setShowNewModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
