'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment, Project } from '@/types';

type ToastLike = { type: 'success' | 'error' | 'warning' | 'info'; message: string };
import { applyDeploymentEvent } from './deployments-utils';

type RealtimeEvent = { type?: string; data?: Record<string, unknown> };
type RealtimeClient = {
  connect: (token: string | (() => string), projectId: string) => Promise<void>;
  subscribeDeployments: (projectId: string, handler: (event: RealtimeEvent) => void) => () => void;
};
type DeploymentsSdk = Omit<FidscriptSDK, 'realtime'> & { realtime?: RealtimeClient };

function normalizeDeployments(data: unknown) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'deployments' in data) {
    const deployments = (data as { deployments?: unknown }).deployments;
    return Array.isArray(deployments) ? deployments : [];
  }
  return [];
}

// ── useDeploymentsFetch ────────────────────────────────────────────────────────

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
          if (!current.some(d => d.id === deploymentId)) {
            void loadDeployments();
            return current;
          }
          return current.map(d =>
            d.id === deploymentId
              ? applyDeploymentEvent(d, event.type as string, event.data ?? {})
              : d,
          );
        });
      });
    }).catch(() => undefined);
    return () => { isCancelled = true; unsubscribe?.(); };
  }, [getSdk, loadDeployments, projectId]);

  const updateDeployment = (id: string, patch: Partial<Deployment>) =>
    setDeployments(current => current.map(d => d.id === id ? { ...d, ...patch } : d));
  const removeDeployment = (id: string) =>
    setDeployments(current => current.filter(d => d.id !== id));

  return { deployments, isLoading, error, loadDeployments, updateDeployment, removeDeployment };
}

// ── useGithubConnection ────────────────────────────────────────────────────────

export function useGithubConnection(project: Project) {
  const { getSdk } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<{ connected: boolean; username?: string; avatarUrl?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getSdk().github.status().then(setStatus).catch(() => setStatus({ connected: false }));
  }, [getSdk]);

  const connect = useCallback(async (onToast: (o: ToastLike) => void) => {
    setConnecting(true);
    try {
      await getSdk().github.connect();
      setStatus(await getSdk().github.status());
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AuthError') {
        router.replace('/login');
        return;
      }
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to connect to GitHub' });
    } finally {
      setConnecting(false);
    }
  }, [getSdk, router]);

  return { status, connecting, connect };
}

// ── useInlineDeploy ────────────────────────────────────────────────────────────

export function useInlineDeploy(project: Project) {
  const { getSdk } = useAuth();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (
    e: React.FormEvent,
    onToast: (o: ToastLike) => void,
    onDeployed: () => void,
  ) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await getSdk().deployments.create(project.id, {
        source: { type: 'git', git: { url: url.trim() } },
      });
      setUrl('');
      onToast({ type: 'success', message: 'Deployment started.' });
      onDeployed();
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Deploy failed.' });
    } finally {
      setSubmitting(false);
    }
  }, [getSdk, project.id, url]);

  return { url, setUrl, submitting, submit };
}
