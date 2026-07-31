'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeftIcon } from '@hugeicons/core-free-icons';
import {
  ProgressTimeline,
  MetadataPanel,
  LogViewer,
  LivePreview,
} from '@/components/deployments';
import type { Deployment } from '@/types';
import { DeploymentActions, RollbackModal, DeleteConfirmModal } from './deployment-actions';

interface DeploymentDetailBodyProps {
  deployment: Deployment;
  acting: string | null;
  logStream: boolean;
  logs: string;
  deploymentId: string;
  projectId: string;
  inFlight: boolean;
  getSdk: () => any;
  showToast: (toast: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => void;
  formatDuration: (start: string, end?: string | null) => string;
  showRollbackPicker: boolean;
  showDeleteConfirm: boolean;
  onAction: (action: string) => void;
  onRollbackOpen: () => void;
  onDeleteOpen: () => void;
  onRollbackClose: () => void;
  onRollbackPicked: () => void;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
}

export function DeploymentDetailBody({
  deployment,
  acting,
  logStream,
  logs,
  deploymentId,
  projectId,
  inFlight,
  getSdk,
  showToast,
  formatDuration,
  showRollbackPicker,
  showDeleteConfirm,
  onAction,
  onRollbackOpen,
  onDeleteOpen,
  onRollbackClose,
  onRollbackPicked,
  onDeleteClose,
  onDeleteConfirm,
}: DeploymentDetailBodyProps) {
  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-5xl">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors"
      >
        <HugeiconsIcon icon={ArrowLeftIcon} size={12} />
        Back to Services
      </Link>

      <DeploymentActions
        deployment={deployment}
        acting={acting}
        logStream={logStream}
        deploymentId={deploymentId}
        projectId={projectId}
        showToast={showToast}
        formatDuration={formatDuration}
        onAction={onAction}
        onRollbackOpen={onRollbackOpen}
        onDeleteOpen={onDeleteOpen}
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
        <RollbackModal
          projectId={projectId}
          deploymentId={deploymentId}
          onClose={onRollbackClose}
          onPicked={onRollbackPicked}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={onDeleteClose}
          onConfirm={onDeleteConfirm}
        />
      )}
    </div>
  );
}
