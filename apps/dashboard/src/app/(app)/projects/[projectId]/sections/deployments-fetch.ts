'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { applyDeploymentEvent } from './deployments-utils';

type RealtimeEvent = { type?: string; data?: Record<string, unknown> };
type RealtimeClient = {
  connect: (token: string | (() => string), projectId: string) => Promise<void>;
  subscribeDeployments: (projectId: string, handler: (event: RealtimeEvent) => void) => () => void;
};

type DeploymentsSdk = Omit<FidscriptSDK, 'realtime'> & { realtime?: RealtimeClient };

function normalizeDeployments(data: unknown): Deployment[] {
  if (Array.isArray(data)) return data as Deployment[];
  if (data && typeof data === 'object' && 'deployments' in data) {
    const deployments = (data as { deployments?: unknown }).deployments;
    return Array.isArray(deployments) ? deployments as Deployment[] : [];
  }
  return [];
}

export function useDeploymentsFetch(projectId: string) {
  const { getSdk } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeployments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDeployments(normalizeDeployments(await getSdk().deployments.list(projectId, { limit: 100 })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load deployments');
    } finally {
      setIsLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => { void loadDeployments(); }, [loadDeployments]);
  useEffect(() => {
    const realtime = (getSdk() as unknown as DeploymentsSdk).realtime;
    if (!realtime) return;
    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;
    const token = () => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '';
    void realtime.connect(token, projectId).then(() => {
      if (isCancelled) return;
      unsubscribe = realtime.subscribeDeployments(projectId, event => {
        if (!event.type?.startsWith('deployments.deployment.')) return;
        const deploymentId = event.data?.deploymentId;
        if (typeof deploymentId !== 'string') return;
        setDeployments(current => {
          if (!current.some(deployment => deployment.id === deploymentId)) {
            void loadDeployments();
            return current;
          }
          return current.map(deployment => deployment.id === deploymentId
            ? applyDeploymentEvent(deployment, event.type as string, event.data ?? {}) : deployment);
        });
      });
    }).catch(() => undefined);
    return () => { isCancelled = true; unsubscribe?.(); };
  }, [getSdk, loadDeployments, projectId]);

  const updateDeployment = (id: string, patch: Partial<Deployment>) =>
    setDeployments(current => current.map(deployment => deployment.id === id ? { ...deployment, ...patch } : deployment));
  const removeDeployment = (id: string) =>
    setDeployments(current => current.filter(deployment => deployment.id !== id));

  return { deployments, isLoading, error, loadDeployments, updateDeployment, removeDeployment };
}
