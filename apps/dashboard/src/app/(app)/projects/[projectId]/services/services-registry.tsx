'use client';

// Services page — registry of deployed applications for this project.
// Renders real `Deployment` entities from DEPL-01 (list) with realtime updates.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';

import { ServicesHeader } from './services-header';
import { ServicesBody } from './services-body';
import { ServicesSkeleton } from './services-skeleton';
import { useServicesRealtime } from './services-realtime';
import { extractRepoKey, isInFlight, type ServiceGroup } from './services-utils';

interface ServicesRegistryProps {
  projectId: string;
}

export function ServicesRegistry({ projectId }: ServicesRegistryProps) {
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const services = useMemo<ServiceGroup[]>(() => {
    const map = new Map<string, Deployment[]>();
    for (const d of deployments) {
      const key = extractRepoKey(d.sourceUrl) ?? d.imageTag ?? 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([name, depls]) => ({
      name,
      deployments: depls.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }));
  }, [deployments]);

  const healthyCount = services.filter(s => s.deployments[0]?.status === 'SUCCESS').length;
  const activeCount  = services.filter(s => isInFlight(s.deployments[0]?.status)).length;

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(projectId, { limit: 100 });
      const list = (data as { deployments?: Deployment[] }).deployments
        ?? (Array.isArray(data) ? (data as Deployment[]) : []);
      setDeployments(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    getSdk().github.status()
      .then(s => setGithubConnected(Boolean(s?.connected)))
      .catch(() => setGithubConnected(false));
  }, [getSdk]);

  useServicesRealtime({ projectId, getSdk, onDeploymentsChange: setDeployments, onReload: load });

  const handleConnectGithub = useCallback(async () => {
    setConnecting(true);
    try {
      const status = await getSdk().github.connect();
      setGithubConnected(Boolean(status?.connected));
      showToast({
        type: 'success',
        message: status?.username ? `Connected to GitHub as ${status.username}` : 'GitHub connected',
      });
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to connect GitHub' });
    } finally {
      setConnecting(false);
    }
  }, [getSdk, showToast]);

  const handleAction = useCallback(async (id: string, action: string) => {
    try {
      const sdk = getSdk();
      if (action === 'stop') {
        await sdk.deployments.stop(projectId, id);
        showToast({ type: 'success', message: 'Deployment stopping.' });
      } else if (action === 'restart') {
        await sdk.deployments.restart(projectId, id);
        showToast({ type: 'success', message: 'Deployment restarting.' });
      } else if (action === 'delete') {
        if (!confirm('Delete this deployment? This cannot be undone.')) return;
        await sdk.deployments.destroy(projectId, id);
        showToast({ type: 'success', message: 'Deployment deleted.' });
      }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    }
  }, [projectId, getSdk, load, showToast]);

  const toggleService = useCallback((name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  if (loading) return <ServicesSkeleton />;

  return (
    <div className="space-y-5">
      <ServicesHeader
        loading={loading}
        serviceCount={services.length}
        healthyCount={healthyCount}
        activeCount={activeCount}
        onRefresh={() => void load()}
        onNewService={() => router.push(`/projects/${projectId}/services/new`)}
      />
      <ServicesBody
        projectId={projectId}
        services={services}
        error={error}
        githubConnected={githubConnected}
        connecting={connecting}
        expanded={expanded}
        onConnectGithub={() => void handleConnectGithub()}
        onAction={(id, action) => void handleAction(id, action)}
        onToggleService={toggleService}
      />
    </div>
  );
}
