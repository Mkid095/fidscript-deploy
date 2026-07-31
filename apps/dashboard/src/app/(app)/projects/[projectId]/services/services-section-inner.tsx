// Services section — data-fetching, realtime, and state for the services page

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { ToastProvider, useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Project, Deployment } from '@/types';
import { isInFlight, extractRepoKey } from './services-utils';
import { useServicesRealtime } from './services-realtime';
import { ServicesHeader } from './services-header';
import { ServicesBody } from './services-body';

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

  const services = (() => {
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

  useServicesRealtime({ projectId: project.id, getSdk, onDeploymentsChange: setDeployments, onReload: load });

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
      <ServicesHeader
        loading={loading} serviceCount={services.length}
        healthyCount={healthyCount} activeCount={activeCount}
        onRefresh={load}
        onNewService={() => router.push(`/projects/${project.id}/services/new`)}
      />
      <ServicesBody
        project={project} deployments={deployments} loading={loading} error={error}
        githubStatus={githubStatus} connecting={connecting}
        expandedServices={expandedServices}
        onConnectGithub={handleConnectGithub}
        onAction={handleAction}
        onToggleService={toggleService}
      />
    </div>
  );
}
