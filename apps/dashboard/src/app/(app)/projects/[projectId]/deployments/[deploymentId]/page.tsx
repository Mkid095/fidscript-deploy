'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeftIcon } from '@hugeicons/core-free-icons';

import { useAuth } from '@/contexts/auth-context';
import type { Deployment } from '@/types';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {
  statusMeta,
  isInFlight,
  formatDuration,
  ProgressTimeline,
  MetadataPanel,
  LogViewer,
  LivePreview,
  RollbackPicker,
  ConfirmDialog,
  DeploymentHeader,
} from '@/components/deployments';
import type { FidscriptSDK } from '@fidscript/sdk';

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

  // Realtime subscription for deployment status updates
  useEffect(() => {
    const sdk = getSdk();
    const rt = (sdk as FidscriptSDK & { realtime?: { connect: (t: string, p: string) => Promise<void>; subscribeDeployments: (p: string, h: (e: any) => void) => () => void } }).realtime;
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

        if (et === 'deployments.deployment.succeeded' || et === 'deployments.deployment.failed' ||
            et === 'deployments.deployment.stopped' || et === 'deployments.deployment.rolled_back') {
          setLogStream(false);
          load(); // Refresh full data on completion
        }
        if (et === 'deployments.deployment.building' || et === 'deployments.deployment.deploying' ||
            et === 'deployments.deployment.queued') {
          setLogStream(true);
          if (data.status) {
            setDeployment(prev => prev ? { ...prev, status: data.status as Deployment['status'] } : prev);
          }
        }
      };

      const unsub = rt.subscribeDeployments(projectId, handler);
      if (cancelled) { unsub(); }
    });

    return () => { cancelled = true; };
  }, [projectId, getSdk, load]);

  // Fallback polling for in-flight deployments
  useEffect(() => {
    if (!deployment || !isInFlight(deployment.status)) return;
    setLogStream(true);
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const sdk = getSdk();
        const [dep, logData] = await Promise.all([
          sdk.deployments.get(projectId, deploymentId),
          sdk.deployments.getLogs(projectId, deploymentId),
        ]);
        if (cancelled) return;
        setDeployment(dep as Deployment);
        setLogs(typeof logData === 'string' ? logData : (logData as any).logs ?? JSON.stringify(logData));
        if (dep && !isInFlight((dep as Deployment).status)) {
          setLogStream(false);
          clearInterval(interval);
        }
      } catch { /* swallow */ }
    }, 2500);
    return () => { cancelled = true; clearInterval(interval); setLogStream(false); };
  }, [projectId, deploymentId, deployment?.status, getSdk]);

  async function handleAction(action: string) {
    setActing(action);
    try {
      const sdk = getSdk();
      if (action === 'stop') {
        await sdk.deployments.stop(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment stopped.' });
      }
      if (action === 'restart') {
        await sdk.deployments.restart(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment restarted.' });
      }
      if (action === 'delete') {
        await sdk.deployments.destroy(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment deleted.' });
        router.push(`/projects/${projectId}`);
        return;
      }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : `Action failed: ${action}` });
    } finally {
      setActing(null);
    }
  }

  if (loading) return (
    <LoadingScreen
      message="Loading deployment"
      submessage="Fetching deployment details and logs..."
      fullScreen={false}
    />
  );

  if (error || !deployment) return (
    <div className="p-6 text-center">
      <p className="text-[var(--danger)] text-sm mb-3">{error ?? 'Not found'}</p>
      <Link href={`/projects/${projectId}`} className="text-xs text-[var(--accent)] hover:text-[var(--accent)]">
        ← Back to Services
      </Link>
    </div>
  );

  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const canRollback = deployment.status === 'SUCCESS';
  const canDelete = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
      >
        <HugeiconsIcon icon={ArrowLeftIcon} size={12} />
        Back to Services
      </Link>

      <DeploymentHeader
        deployment={deployment}
        meta={meta}
        acting={acting}
        logStream={logStream}
        inFlight={inFlight}
        canRollback={canRollback}
        canDelete={canDelete}
        onAction={handleAction}
        onRollback={() => setShowRollbackPicker(true)}
        onDelete={() => setShowDeleteConfirm(true)}
        showToast={showToast}
        formatDuration={formatDuration}
      />

      <ProgressTimeline status={deployment.status} />
      <MetadataPanel deployment={deployment} />

      {logs !== undefined && (
        <LogViewer
          logs={logs}
          inFlight={inFlight}
          realtimeEnabled={inFlight}
          deploymentId={deploymentId}
          projectId={projectId}
          getSdk={getSdk}
        />
      )}

      {deployment.status === 'SUCCESS' && deployment.deploymentUrl && (
        <LivePreview url={deployment.deploymentUrl} />
      )}

      {showRollbackPicker && (
        <Modal isOpen={true} title="Roll back deployment" onClose={() => setShowRollbackPicker(false)}>
          <RollbackPicker
            projectId={projectId}
            currentId={deploymentId}
            onPicked={() => { setShowRollbackPicker(false); showToast({ type: 'success', message: 'Rollback initiated.' }); load(); }}
            onClose={() => setShowRollbackPicker(false)}
          />
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete deployment"
          message="This will permanently delete this deployment and remove it from the list. This action cannot be undone."
          confirmLabel="Delete deployment"
          variant="danger"
          onConfirm={() => { setShowDeleteConfirm(false); handleAction('delete'); }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default function DeploymentDetailPage() {
  return (
    <ToastProvider>
      <DeploymentDetailInner />
    </ToastProvider>
  );
}
