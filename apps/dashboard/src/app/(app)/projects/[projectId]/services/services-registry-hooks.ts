'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { useServicesRealtime } from './services-realtime';

export interface UseServicesRegistryOptions {
  projectId: string;
}

export interface UseServicesRegistryResult {
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  githubConnected: boolean;
  connecting: boolean;
  load: () => Promise<void>;
  handleConnectGithub: () => Promise<void>;
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
  const [githubConnected, setGithubConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

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

  return {
    deployments,
    loading,
    error,
    githubConnected,
    connecting,
    load,
    handleConnectGithub,
    handleAction,
  };
}
