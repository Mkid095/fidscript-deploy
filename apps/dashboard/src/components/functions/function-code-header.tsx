'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { PlayCircleIcon, Upload03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';

import { FunctionStatusBadge } from './function-status-badge';

interface FunctionCodeHeaderProps {
  functionName: string;
  runtime: string;
  currentVersion?: string | null;
  memoryMb?: number | null;
  status: string;
  deploying: boolean;
  onInvoke: () => void;
  onDeploy: () => void;
}

const RUNTIME_LABELS: Record<string, string> = {
  node: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

export function FunctionCodeHeader({
  functionName,
  runtime,
  currentVersion,
  memoryMb,
  status,
  deploying,
  onInvoke,
  onDeploy,
}: FunctionCodeHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap px-4 py-2.5 border-b border-[var(--rail)] bg-[var(--surface-2)]/30">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            {functionName}
            <FunctionStatusBadge status={status} />
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {RUNTIME_LABELS[runtime] ?? runtime}
            {currentVersion && ` · v${currentVersion}`}
            {memoryMb && ` · ${memoryMb}MB`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onInvoke}
          className="flex items-center gap-1.5 text-xs"
        >
          <HugeiconsIcon icon={PlayCircleIcon} size={12} />
          Test
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onDeploy}
          disabled={deploying || status === 'BUILDING'}
          className="flex items-center gap-1.5 text-xs"
        >
          {deploying ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <HugeiconsIcon icon={Upload03Icon} size={12} />
          )}
          Deploy
        </Button>
      </div>
    </div>
  );
}
