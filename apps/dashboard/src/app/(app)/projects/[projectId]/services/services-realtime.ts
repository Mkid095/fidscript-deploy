// Realtime hook for services page

import { useEffect, useRef } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';
import { isTerminal } from './services-utils';

interface UseServicesRealtimeOptions {
  projectId: string;
  getSdk: () => FidscriptSDK;
  onDeploymentsChange: (fn: (prev: any[]) => any[]) => void;
  onReload: () => void;
}

export function useServicesRealtime({ projectId, getSdk, onDeploymentsChange, onReload }: UseServicesRealtimeOptions) {
  const rtRef = useRef<{ disconnect: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function connectRealtime() {
      try {
        const sdk = getSdk();
        const rt = (sdk as { realtime?: typeof sdk.realtime }).realtime;
        if (!rt) return;
        await rt.connect(
          () => localStorage.getItem('fidscript_access_token') ?? localStorage.getItem('fidscript_token') ?? '',
          projectId,
        );
        if (cancelled) { rt.disconnect?.(); return; }
        const unsub = rt.subscribeDeployments(projectId, (event: any) => {
          const meta = event?.data ?? event?.metadata ?? event;
          const deploymentId = meta.deploymentId;
          const eventType: string = event?.type ?? '';
          const statusMap: Record<string, string> = {
            'deployments.deployment.queued': 'QUEUED',
            'deployments.deployment.building': 'BUILDING',
            'deployments.deployment.deploying': 'DEPLOYING',
            'deployments.deployment.succeeded': 'SUCCESS',
            'deployments.deployment.failed': 'FAILED',
            'deployments.deployment.stopped': 'STOPPED',
            'deployments.deployment.blocked': 'BLOCKED',
            'deployments.deployment.rolled_back': 'ROLLED_BACK',
          };
          const newStatus = statusMap[eventType];
          if (newStatus && deploymentId) {
            onDeploymentsChange(prev => prev.map(d => d.id === deploymentId ? { ...d, status: newStatus } : d));
          }
          if (newStatus && isTerminal(newStatus)) {
            setTimeout(() => onReload(), 500);
          }
        });
        rtRef.current = { disconnect: () => { unsub(); rt.disconnect?.(); } };
      } catch {
        // Realtime is best-effort
      }
    }
    connectRealtime();
    return () => { cancelled = true; rtRef.current?.disconnect?.(); };
  }, [projectId, getSdk, onDeploymentsChange, onReload]);
}
