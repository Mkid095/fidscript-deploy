'use client';

import { useEffect, useRef } from 'react';
import type { Deployment } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export function useDeploymentRealtime({
  projectId,
  deploymentId,
  deployment,
  getSdk,
  onUpdate,
  onLogStream,
  load,
}: {
  projectId: string;
  deploymentId: string;
  deployment: Deployment | null;
  getSdk: () => FidscriptSDK;
  onUpdate: (status: Deployment['status']) => void;
  onLogStream: (v: boolean) => void;
  load: () => Promise<void>;
}) {
  // Realtime subscription
  useEffect(() => {
    const sdk = getSdk();
    const rt = (sdk as FidscriptSDK & { realtime?: { connect: (t: () => string, p: string) => Promise<void>; subscribeDeployments: (p: string, h: (e: any) => void) => () => void } }).realtime;
    if (!rt) return;

    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '')
      : '';

    let cancelled = false;

    rt.connect(() => token, projectId).then(() => {
      if (cancelled) return;
      const handler = (event: { type?: string; data?: Record<string, any> }) => {
        const et = event?.type;
        if (!et || !et.startsWith('deployments.deployment.')) return;
        const data = event?.data ?? {};

        if (['deployments.deployment.succeeded', 'deployments.deployment.failed', 'deployments.deployment.stopped', 'deployments.deployment.rolled_back'].includes(et)) {
          onLogStream(false);
          load();
        }
        if (['deployments.deployment.building', 'deployments.deployment.deploying', 'deployments.deployment.queued'].includes(et)) {
          onLogStream(true);
          if (data.status) {
            onUpdate(data.status as Deployment['status']);
          }
        }
      };
      const unsub = rt.subscribeDeployments(projectId, handler);
      if (cancelled) unsub();
    });

    return () => { cancelled = true; };
  }, [projectId, getSdk, onUpdate, onLogStream, load]);

  // Fallback polling for in-flight deployments
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!deployment || !['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes(deployment.status)) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    onLogStream(true);
    let cancelled = false;
    intervalRef.current = setInterval(async () => {
      try {
        const sdk = getSdk();
        const [dep, logData] = await Promise.all([
          sdk.deployments.get(projectId, deploymentId),
          sdk.deployments.getLogs(projectId, deploymentId),
        ]);
        if (cancelled) return;
        onUpdate((dep as Deployment).status);
        if (!['PENDING', 'QUEUED', 'BUILDING', 'DEPLOYING'].includes((dep as Deployment).status)) {
          onLogStream(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch { /* swallow */ }
    }, 2500);

    return () => { cancelled = true; if (intervalRef.current) clearInterval(intervalRef.current); onLogStream(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, deploymentId, deployment?.status, getSdk]);
}
