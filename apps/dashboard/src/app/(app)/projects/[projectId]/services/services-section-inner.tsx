// Services section — all data-fetching and logic for the services page

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, EmptyState, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, Add01Icon, RefreshIcon, GithubIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';

import { ToastProvider, useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';
import { ServiceCard } from './service-card';
import { ServicesSkeleton } from './services-skeleton';
import { isInFlight, extractRepoKey, type ServiceGroup } from './services-utils';
import { useServicesRealtime } from './services-realtime';

interface ServicesSectionInnerProps {
  project: Project;
}

export function ServicesSectionInner({ project }: ServicesSectionInnerProps) {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubStatus, setGithubStatus] = useState<{ connected: boolean } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const services: ServiceGroup[] = (() => {
    const map = new Map<string, Deployment[]>();
    for (const d of deployments) {
      const key = (d as any).serviceName || extractRepoKey(d.sourceUrl) || 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([name, depls]) => ({
      name,
      deployments: depls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  })();

  const healthyCount = services.filter(s => s.deployments[0]?.status === 'SUCCESS').length;
  const activeCount = services.filter(s => isInFlight(s.deployments[0]?.status)).length;

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(project.id, { limit: 100 });
      setDeployments((data as any).deployments ?? (Array.isArray(data) ? data : []));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [project.id, getSdk]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getSdk().github.status().then(s => setGithubStatus(s)).catch(() => setGithubStatus({ connected: false }));
  }, [getSdk]);

  useServicesRealtime({
    projectId: project.id,
    getSdk,
    onDeploymentsChange: setDeployments,
    onReload: load,
  });

  async function handleConnectGithub() {
    setConnecting(true);
    try {
      await getSdk().github.connect();
      const status = await getSdk().github.status();
      setGithubStatus(status);
      showToast({ type: 'success', message: `Connected to GitHub as ${status.username}` });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to connect GitHub' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleAction(id: string, action: string) {
    try {
      const sdk = getSdk();
      if (action === 'stop')    { await sdk.deployments.stop(project.id, id); showToast({ type: 'success', message: 'Deployment stopping.' }); }
      if (action === 'restart') { await sdk.deployments.restart(project.id, id); showToast({ type: 'success', message: 'Deployment restarting.' }); }
      if (action === 'delete')  { if (!confirm('Delete this deployment? This cannot be undone.')) return; await sdk.deployments.destroy(project.id, id); showToast({ type: 'success', message: 'Deployment deleted.' }); }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    }
  }

  function toggleService(name: string) {
    setExpandedServices(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Services</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {loading ? 'Loading…' : (
              <>
                {services.length} service{services.length !== 1 ? 's' : ''}
                {healthyCount > 0 && ` · ${healthyCount} live`}
                {activeCount > 0 && <span className="text-[var(--warning)]"> · {activeCount} active</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="text-[var(--text-muted)]" aria-label="Refresh"><HugeiconsIcon icon={RefreshIcon} size={14} /></Button>
          <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${project.id}/services/new`)} className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Add01Icon} size={13} /> New service
          </Button>
        </div>
      </div>

      {error && <Card className="border border-[var(--danger)]/30 py-3 px-4 bg-[var(--danger)]/5"><p className="text-sm text-[var(--danger)]">{error}</p></Card>}

      {loading && <ServicesSkeleton />}

      {!loading && services.length === 0 && (
        <EmptyState
          icon={<div className="w-16 h-16 rounded-2xl bg-[var(--rail)] border border-[var(--rail-light)] flex items-center justify-center"><HugeiconsIcon icon={Rocket01Icon} size={32} className="text-[var(--text-muted)]" /></div>}
          title="Deploy your first service"
          description="Connect a Git provider or upload an archive to deploy your first service."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Button variant="primary" size="sm" onClick={() => router.push(`/projects/${project.id}/services/new`)} className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={13} /> Create service
              </Button>
              {!githubStatus?.connected && (
                <Button variant="ghost" size="sm" onClick={handleConnectGithub} disabled={connecting} className="flex items-center gap-1.5 text-[var(--text-muted)]">
                  {connecting ? <Spinner size="sm" /> : <HugeiconsIcon icon={GithubIcon} size={13} />}
                  Connect GitHub
                </Button>
              )}
            </div>
          }
        />
      )}

      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(svc => (
            <ServiceCard key={svc.name} service={svc} projectId={project.id}
              onAction={handleAction} isExpanded={expandedServices.has(svc.name)} onToggle={() => toggleService(svc.name)} />
          ))}
        </div>
      )}

      {!loading && services.length > 0 && !activeCount && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--text-dim)]">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-[var(--success)]" /> All services are healthy
        </div>
      )}
    </div>
  );
}
