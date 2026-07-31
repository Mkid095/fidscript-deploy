'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@fidscript/ui';
import { useToast } from '@/components/toast-provider';
import {
  statusMeta,
  isInFlight,
  ProgressTimeline,
  MetadataPanel,
  LogViewer,
  LivePreview,
  RollbackPicker,
  ConfirmDialog,
  DeploymentHeader,
} from '@/components/deployments';
import type { Deployment } from '@/types';

interface DeploymentActionsProps {
  deployment: Deployment;
  acting: string | null;
  logStream: boolean;
  deploymentId: string;
  projectId: string;
  getSdk: () => any;
  showRollbackPicker: boolean;
  showDeleteConfirm: boolean;
  load: () => Promise<void>;
  setShowRollbackPicker: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
}

export function DeploymentActions({
  deployment,
  acting,
  logStream,
  deploymentId,
  projectId,
  getSdk,
  showRollbackPicker,
  showDeleteConfirm,
  load,
  setShowRollbackPicker,
  setShowDeleteConfirm,
}: DeploymentActionsProps) {
  const { showToast } = useToast();
  const router = useRouter();

  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const canRollback = deployment.status === 'SUCCESS';
  const canDelete = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);

  async function handleAction(action: string) {
    if (acting) return;
    try {
      const sdk = getSdk();
      if (action === 'stop') { await sdk.deployments.stop(projectId, deploymentId); showToast({ type: 'success', message: 'Deployment stopped.' }); }
      if (action === 'restart') { await sdk.deployments.restart(projectId, deploymentId); showToast({ type: 'success', message: 'Deployment restarted.' }); }
      if (action === 'delete') {
        await sdk.deployments.destroy(projectId, deploymentId);
        showToast({ type: 'success', message: 'Deployment deleted.' });
        router.push(`/projects/${projectId}`);
        return;
      }
      await load();
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : `Action failed: ${action}` });
    }
  }

  return (
    <>
      <DeploymentHeader
        deployment={deployment} meta={meta} acting={acting} logStream={logStream}
        inFlight={inFlight} canRollback={canRollback} canDelete={canDelete}
        onAction={handleAction} onRollback={() => setShowRollbackPicker(true)}
        onDelete={() => setShowDeleteConfirm(true)} showToast={showToast}
        formatDuration={(s: number) => `${Math.floor(s / 60)}m ${s % 60}s`}
      />

      <ProgressTimeline status={deployment.status} />
      <MetadataPanel deployment={deployment} />

      <LogViewer logs={''} inFlight={inFlight} realtimeEnabled={inFlight}
        deploymentId={deploymentId} projectId={projectId} getSdk={getSdk} />

      {deployment.status === 'SUCCESS' && deployment.deploymentUrl && (
        <LivePreview url={deployment.deploymentUrl} />
      )}

      {showRollbackPicker && (
        <Modal isOpen title="Roll back deployment" onClose={() => setShowRollbackPicker(false)}>
          <RollbackPicker projectId={projectId} currentId={deploymentId}
            onPicked={() => { setShowRollbackPicker(false); showToast({ type: 'success', message: 'Rollback initiated.' }); load(); }}
            onClose={() => setShowRollbackPicker(false)} />
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog title="Delete deployment"
          message="This will permanently delete this deployment and remove it from the list. This action cannot be undone."
          confirmLabel="Delete deployment" variant="danger"
          onConfirm={() => { setShowDeleteConfirm(false); handleAction('delete'); }}
          onClose={() => setShowDeleteConfirm(false)} />
      )}
    </>
  );
}
