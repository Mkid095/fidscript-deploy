'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { isInFlight, statusMeta } from '@/components/deployments';
import { DeploymentDetailBody } from './deployment-detail-body';
import { useDeploymentRealtime } from './use-deployment-realtime';

function formatDuration(start: string, end?: string | null): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, e - s);
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s`;
}

function DeploymentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const projectId = params.projectId as string;
  const deploymentId = params.deploymentId as string;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState<string>('');
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

  useDeploymentRealtime({
    projectId,
    deploymentId,
    deployment,
    getSdk,
    onUpdate: status => setDeployment(prev => prev ? { ...prev, status } : prev),
    onLogStream: setLogStream,
    load,
  });

  async function handleAction(action: string) {
    setActing(action);
    try {
      const sdk = getSdk();
      if (action === 'stop') { await sdk.deployments.stop(projectId, deploymentId); showToast({ type: 'success', message: 'Deployment stopped.' }); }
      if (action === 'restart') { await sdk.deployments.restart(projectId, deploymentId); showToast({ type: 'success', message: 'Deployment restarted.' }); }
      if (action === 'delete') { await sdk.deployments.destroy(projectId, deploymentId); showToast({ type: 'success', message: 'Deployment deleted.' }); router.push(`/projects/${projectId}`); return; }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : `Action failed: ${action}` });
    } finally {
      setActing(null);
    }
  }

  async function handleRollbackPicked() {
    setShowRollbackPicker(false);
    showToast({ type: 'success', message: 'Rollback initiated.' });
    await load();
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    await handleAction('delete');
  }

  if (loading) return (
    <LoadingScreen message="Loading deployment" submessage="Fetching deployment details and logs..." fullScreen={false} />
  );

  if (error || !deployment) return (
    <div className="p-6 text-center">
      <p className="text-[var(--danger)] text-sm mb-3">{error ?? 'Not found'}</p>
      <Link href={`/projects/${projectId}`} className="text-xs text-[var(--accent)] hover:text-[var(--accent)]">← Back to Services</Link>
    </div>
  );

  const inFlight = isInFlight(deployment.status);

  return (
    <DeploymentDetailBody
      deployment={deployment}
      acting={acting}
      logStream={logStream}
      logs={logs}
      deploymentId={deploymentId}
      projectId={projectId}
      inFlight={inFlight}
      getSdk={getSdk}
      showToast={showToast}
      formatDuration={formatDuration}
      showRollbackPicker={showRollbackPicker}
      showDeleteConfirm={showDeleteConfirm}
      onAction={handleAction}
      onRollbackOpen={() => setShowRollbackPicker(true)}
      onDeleteOpen={() => setShowDeleteConfirm(true)}
      onRollbackClose={() => setShowRollbackPicker(false)}
      onRollbackPicked={handleRollbackPicked}
      onDeleteClose={() => setShowDeleteConfirm(false)}
      onDeleteConfirm={handleDeleteConfirm}
    />
  );
}

export default function DeploymentDetailPage() {
  return (
    <ToastProvider>
      <DeploymentDetailInner />
    </ToastProvider>
  );
}
