'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import type { Deployment } from '@/types';

const IN_FLIGHT_STATUSES = new Set(['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING']);

export interface UseDeploymentsListOptions {
  projectId: string;
  getSdk: () => FidscriptSDK;
}

export interface UseDeploymentsListReturn {
  deployments: Deployment[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDeploymentsList({ projectId, getSdk }: UseDeploymentsListOptions): UseDeploymentsListReturn {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const sdk = getSdk();
      const data = await sdk.deployments.list(projectId, { limit: 50 });
      const list: Deployment[] = (data as { deployments?: Deployment[] }).deployments
        ?? (data as unknown as Deployment[]);
      setDeployments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { void load(); }, [load]);

  // Realtime subscription — refresh list on any deployment event
  useEffect(() => {
    if (!projectId) return;
    const sdk = getSdk();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rt = (sdk as any)?.realtime;
    if (!rt) return;

    const token =
      typeof window !== 'undefined'
        ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
        : '';

    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const handler = (_evt: { type?: string; data?: Record<string, unknown> }) => {
        void load();
      };
      rt.subscribeDeployments(projectId, handler);
    });

    return () => { cancelled = true; };
  }, [projectId, getSdk, load]);

  // Polling fallback for in-flight deployments
  useEffect(() => {
    const hasInFlight = deployments.some(d => IN_FLIGHT_STATUSES.has(d.status));
    if (!hasInFlight) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => { void load(); }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [deployments, load]);

  return { deployments, loading, error, reload: load };
}
