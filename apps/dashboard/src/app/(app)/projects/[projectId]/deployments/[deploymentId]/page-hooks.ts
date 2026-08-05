import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Deployment } from '@/types';
import { useAuth } from '@/contexts/auth-context';

interface UseDeploymentDetailOptions {
  projectId: string;
  deploymentId: string;
  showToast?: (toast: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => void;
}

interface UseDeploymentDetailReturn {
  deployment: Deployment | null;
  logs: string;
  loading: boolean;
  error: string | null;
  acting: string | null;
  showRollbackPicker: boolean;
  setShowRollbackPicker: (v: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  logStream: boolean;
  setLogStream: (v: boolean) => void;
  load: () => Promise<void>;
  handleAction: (action: string) => Promise<void>;
  handleRollbackPicked: () => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
}

export function useDeploymentDetail({
  projectId,
  deploymentId,
  showToast,
}: UseDeploymentDetailOptions): UseDeploymentDetailReturn {
  const { getSdk } = useAuth();
  const router = useRouter();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [showRollbackPicker, setShowRollbackPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logStream, setLogStream] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [dep, logData] = await Promise.all([
        sdk.deployments.get(projectId, deploymentId),
        sdk.deployments.getLogs(projectId, deploymentId),
      ]);
      setDeployment(dep as Deployment);
      setLogs(typeof logData === 'string' ? logData : (logData as any).logs ?? JSON.stringify(logData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId, deploymentId, getSdk]);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (action: string) => {
    setActing(action);
    try {
      const sdk = getSdk();
      if (action === 'stop') { await sdk.deployments.stop(projectId, deploymentId); showToast?.({ type: 'success', message: 'Deployment stopped.' }); }
      if (action === 'restart') { await sdk.deployments.restart(projectId, deploymentId); showToast?.({ type: 'success', message: 'Deployment restarted.' }); }
      if (action === 'delete') { await sdk.deployments.destroy(projectId, deploymentId); showToast?.({ type: 'success', message: 'Deployment deleted.' }); router.push(`/projects/${projectId}`); return; }
      await load();
    } catch (err) {
      showToast?.({ type: 'error', message: err instanceof Error ? err.message : `Action failed: ${action}` });
    } finally {
      setActing(null);
    }
  }, [projectId, deploymentId, getSdk, load, router, showToast]);

  const handleRollbackPicked = useCallback(async () => {
    setShowRollbackPicker(false);
    showToast?.({ type: 'success', message: 'Rollback initiated.' });
    await load();
  }, [load, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    await handleAction('delete');
  }, [handleAction]);

  return {
    deployment, logs, loading, error, acting,
    showRollbackPicker, setShowRollbackPicker,
    showDeleteConfirm, setShowDeleteConfirm,
    logStream, setLogStream,
    load, handleAction, handleRollbackPicked, handleDeleteConfirm,
  };
}
