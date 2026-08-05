'use client';

// Services page — registry of deployed applications for this project.
// Renders real `Deployment` entities from DEPL-01 (list) with realtime updates.

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Deployment } from '@/types';

import { ServicesHeader } from './services-header';
import { ServicesBody } from './services-body';
import { ServicesSkeleton } from './services-skeleton';
import { useServicesRegistry } from './services-registry-hooks';
import { extractRepoKey, isInFlight, type ServiceGroup } from './services-utils';

interface ServicesRegistryProps {
  projectId: string;
}

export function ServicesRegistry({ projectId }: ServicesRegistryProps) {
  const router = useRouter();

  const {
    deployments,
    loading,
    error,
    githubConnected,
    connecting,
    load,
    handleConnectGithub,
    handleAction,
  } = useServicesRegistry({ projectId });

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
