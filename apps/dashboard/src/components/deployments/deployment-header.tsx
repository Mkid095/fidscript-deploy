'use client';

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock02Icon } from '@hugeicons/core-free-icons';

import type { Deployment } from '@/types';
import { StatusBadge } from './status-badge';
import { ActionButtons } from './action-buttons';
import { DeploymentUrl } from './deployment-url';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface DeploymentHeaderProps {
  deployment: Deployment;
  meta: { label: string; variant: string };
  acting: string | null;
  logStream: boolean;
  inFlight: boolean;
  canRollback: boolean;
  canDelete: boolean;
  onAction: (action: string) => void;
  onRollback: () => void;
  onDelete: () => void;
  showToast: (toast: { type: ToastType; message: string }) => void;
  formatDuration: (start: string, end?: string | null) => string;
}

export function DeploymentHeader({
  deployment,
  meta,
  acting,
  logStream,
  inFlight,
  canRollback,
  canDelete,
  onAction,
  onRollback,
  onDelete,
  showToast,
  formatDuration,
}: DeploymentHeaderProps) {
  return (
    <Card className="border border-[var(--rail)] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <StatusBadge meta={meta} acting={acting} logStream={logStream} />
        <ActionButtons
          inFlight={inFlight}
          deployment={deployment}
          canRollback={canRollback}
          canDelete={canDelete}
          acting={acting}
          onAction={onAction}
          onRollback={onRollback}
          onDelete={onDelete}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-[var(--text-muted)] mb-2">
        <span className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Clock02Icon} size={12} className="text-[var(--text-dim)]" />
          {new Date(deployment.createdAt).toLocaleString()}
        </span>
        {deployment.completedAt && (
          <span className="text-[var(--text-dim)]">
            · {formatDuration(deployment.createdAt, deployment.completedAt)}
          </span>
        )}
      </div>

      {deployment.deploymentUrl && (
        <DeploymentUrl url={deployment.deploymentUrl} onCopy={() => showToast({ type: 'success', message: 'URL copied.' })} />
      )}
    </Card>
  );
}
