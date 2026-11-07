'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { useServicesRealtime } from './services-realtime';
import { useGithubConnect, type GithubConnect } from '@/hooks/use-github-connect';

export interface UseServicesRegistryOptions {
  projectId: string;
}

export interface UseServicesRegistryResult {
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  githubConnected: boolean;
  connecting: boolean;
  /** The GitHub connection — the dialog state and the two ways in. */
  github: GithubConnect;
  load: () => Promise<void>;
  handleAction: (id: string, action: string) => Promise<void>;
}

export function useServicesRegistry({
  projectId,
}: UseServicesRegistryOptions): UseServicesRegistryResult {
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const github = useGithubConnect({
    getSdk,
    onShowToast: opts =>
      showToast({ type: opts.type as 'success' | 'error', message: opts.message }),
  });

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(projectId, { limit: 100 });
      const list = (data as { deployments?: Deployment[] }).deployments
        ?? (Array.isArray(data) ? data : []);
      setDeployments(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { void load(); }, [load]);

  useServicesRealtime({ projectId, onDeploymentsChange: setDeployments, onReload: load });

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

  return {
    deployments,
    loading,
    error,
    githubConnected: Boolean(github.status?.connected),
    connecting: github.connecting,
    github,
    load,
    handleAction,
  };
}
