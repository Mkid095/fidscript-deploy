'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';
import { isInFlight } from '@/components/deployments';
import { DeploymentDetailBody } from './deployment-detail-body';
import { useDeploymentRealtime } from './use-deployment-realtime';
import { useDeploymentDetail } from './page-hooks';

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
  const { getSdk } = useAuth();
  const { showToast } = useToast();
  const projectId = params.projectId as string;
  const deploymentId = params.deploymentId as string;

  const {
    deployment, logs, loading, error, acting,
    showRollbackPicker, setShowRollbackPicker,
    showDeleteConfirm, setShowDeleteConfirm,
    logStream, setLogStream,
    handleAction, handleRollbackPicked, handleDeleteConfirm,
  } = useDeploymentDetail({ projectId, deploymentId, showToast });

  useDeploymentRealtime({
    projectId,
    deploymentId,
    deployment,
    getSdk,
    onUpdate: status => deployment ? { ...deployment, status } : deployment,
    onLogStream: setLogStream,
    load: async () => {},
  });

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
