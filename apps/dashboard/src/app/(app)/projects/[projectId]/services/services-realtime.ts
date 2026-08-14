// Realtime hook for services page — uses shared RealtimeProvider context
// to avoid double-connecting (the provider owns the socket; this hook only subscribes).

import { useEffect, useRef } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { isTerminal } from './services-utils';
import type { Deployment } from '@/types';

interface UseServicesRealtimeOptions {
  projectId: string;
  onDeploymentsChange: (fn: (prev: Deployment[]) => Deployment[]) => void;
  onReload: () => void;
}

// PlatformEvent envelope emitted by the backend event bus.
interface PlatformEvent {
  type: string;
  metadata: {
    deploymentId?: string;
    projectId?: string;
    userId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const STATUS_MAP: Record<string, string> = {
  'deployments.deployment.queued':      'QUEUED',
  'deployments.deployment.building':    'BUILDING',
  'deployments.deployment.deploying':   'DEPLOYING',
  'deployments.deployment.succeeded':   'SUCCESS',
  'deployments.deployment.failed':      'FAILED',
  'deployments.deployment.stopped':     'STOPPED',
  'deployments.deployment.blocked':     'BLOCKED',
  'deployments.deployment.rolled_back': 'ROLLED_BACK',
};

export function useServicesRealtime({ projectId, onDeploymentsChange, onReload }: UseServicesRealtimeOptions) {
  const { subscribe } = useRealtime();
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;

  useEffect(() => {
    const unsub = subscribe('deployments', (raw) => {
      const event = raw as PlatformEvent;
      const eventType: string = event?.type ?? '';
      const newStatus = STATUS_MAP[eventType];
      const meta = event?.metadata;
      const deploymentId = meta?.deploymentId;

      if (newStatus && deploymentId) {
        onDeploymentsChange(prev =>
          prev.map(d => d.id === deploymentId ? { ...d, status: newStatus } : d),
        );
      }
      if (newStatus && isTerminal(newStatus)) {
        setTimeout(() => { onReloadRef.current(); }, 500);
      }
    });
    return unsub;
  }, [projectId, subscribe, onDeploymentsChange]);
}
