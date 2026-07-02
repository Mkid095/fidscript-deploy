'use client';

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  StopCircleIcon,
  PlayCircleIcon,
  Delete01Icon,
  RotateClockwiseIcon,
} from '@hugeicons/core-free-icons';

import type { Deployment } from '@/types';

interface ActionButtonsProps {
  inFlight: boolean;
  deployment: Deployment;
  canRollback: boolean;
  canDelete: boolean;
  acting: string | null;
  onAction: (action: string) => void;
  onRollback: () => void;
  onDelete: () => void;
}

export function ActionButtons({
  inFlight,
  deployment,
  canRollback,
  canDelete,
  acting,
  onAction,
  onRollback,
  onDelete,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {inFlight && (
        <Button variant="secondary" size="sm" onClick={() => onAction('stop')} loading={acting === 'stop'}>
          <HugeiconsIcon icon={StopCircleIcon} size={13} />
          <span className="hidden sm:inline">Stop</span>
        </Button>
      )}
      {(deployment.status === 'STOPPED' || deployment.status === 'FAILED') && (
        <Button variant="secondary" size="sm" onClick={() => onAction('restart')} loading={acting === 'restart'}>
          <HugeiconsIcon icon={PlayCircleIcon} size={13} />
          <span className="hidden sm:inline">Restart</span>
        </Button>
      )}
      {canRollback && (
        <Button variant="secondary" size="sm" onClick={onRollback}>
          <HugeiconsIcon icon={RotateClockwiseIcon} size={13} />
          <span className="hidden sm:inline">Rollback</span>
        </Button>
      )}
      {canDelete && (
        <Button variant="danger" size="sm" onClick={onDelete}>
          <HugeiconsIcon icon={Delete01Icon} size={13} />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      )}
    </div>
  );
}
