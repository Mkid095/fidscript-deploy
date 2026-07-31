'use client';

import { Modal } from '@fidscript/ui';
import {
  RollbackPicker,
  ConfirmDialog,
  DeploymentHeader,
  statusMeta,
  isInFlight,
} from '@/components/deployments';
import type { Deployment } from '@/types';

interface DeploymentActionsProps {
  deployment: Deployment;
  acting: string | null;
  logStream: boolean;
  deploymentId: string;
  projectId: string;
  onAction: (action: string) => void;
  onRollbackOpen: () => void;
  onDeleteOpen: () => void;
}

export function DeploymentActions({
  deployment,
  acting,
  logStream,
  deploymentId,
  projectId,
  onAction,
  onRollbackOpen,
  onDeleteOpen,
}: DeploymentActionsProps) {
  const meta = statusMeta(deployment.status);
  const inFlight = isInFlight(deployment.status);
  const canRollback = deployment.status === 'SUCCESS';
  const canDelete = ['SUCCESS', 'STOPPED', 'FAILED'].includes(deployment.status);

  return (
    <DeploymentHeader
      deployment={deployment} meta={meta} acting={acting} logStream={logStream}
      inFlight={inFlight} canRollback={canRollback} canDelete={canDelete}
      onAction={onAction} onRollback={onRollbackOpen}
      onDelete={onDeleteOpen}
    />
  );
}

export function RollbackModal({
  projectId,
  deploymentId,
  onClose,
  onPicked,
}: {
  projectId: string;
  deploymentId: string;
  onClose: () => void;
  onPicked: () => void;
}) {
  return (
    <Modal isOpen title="Roll back deployment" onClose={onClose}>
      <RollbackPicker projectId={projectId} currentId={deploymentId}
        onPicked={onPicked} onClose={onClose} />
    </Modal>
  );
}

export function DeleteConfirmModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog title="Delete deployment"
      message="This will permanently delete this deployment and remove it from the list. This action cannot be undone."
      confirmLabel="Delete deployment" variant="danger"
      onConfirm={onConfirm} onClose={onClose} />
  );
}
