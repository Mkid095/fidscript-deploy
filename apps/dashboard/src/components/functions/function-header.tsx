'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete01Icon, PlayCircleIcon, Upload03Icon } from '@hugeicons/core-free-icons';
import { Button, Spinner } from '@fidscript/ui';

import { FunctionStatusBadge } from './function-status-badge';
import { ConfirmDialog } from '@/components/deployments/confirm-dialog';
import type { Function_ } from '@/types';

interface FunctionHeaderProps {
  fn: Function_;
  deploying: boolean;
  invokeError?: string | null;
  invokeResult?: string | null;
  onDeploy: () => void;
  onInvoke: () => void;
  onDelete: () => void;
}

const RUNTIME_LABELS: Record<string, string> = {
  node: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

export function FunctionHeader({
  fn,
  deploying,
  invokeError,
  invokeResult,
  onDeploy,
  onInvoke,
  onDelete,
}: FunctionHeaderProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: name + meta */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
            <HugeiconsIcon icon={PlayCircleIcon} size={22} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
              {fn.name}
              <FunctionStatusBadge status={fn.status} />
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {RUNTIME_LABELS[fn.runtime] ?? fn.runtime}
              {fn.currentVersion && ` · v${fn.currentVersion}`}
              {fn.memoryMb && ` · ${fn.memoryMb}MB`}
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          {invokeError && (
            <span className="text-xs text-[var(--danger)] mr-2">{invokeError}</span>
          )}
          {invokeResult && (
            <span className="text-xs text-[var(--success)] mr-2">Invoked successfully</span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onInvoke}
            className="flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={PlayCircleIcon} size={14} />
            Test
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onDeploy}
            disabled={deploying || fn.status === 'BUILDING'}
            className="flex items-center gap-1.5"
          >
            {deploying ? <Spinner size="sm" /> : <HugeiconsIcon icon={Upload03Icon} size={14} />}
            Deploy
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="text-[var(--text-dim)] hover:text-rose-400"
          >
            <HugeiconsIcon icon={Delete01Icon} size={16} />
          </Button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Function"
          message={`Are you sure you want to delete "${fn.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={onDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
