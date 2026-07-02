'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, StopCircleIcon, RotateClockwiseIcon } from '@hugeicons/core-free-icons';

interface TerminalStateProps {
  status?: string;
}

export function TerminalState({ status }: TerminalStateProps) {
  if (!status) return null;

  const stateStyles: Record<string, string> = {
    FAILED:       'border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[var(--danger)]',
    ROLLED_BACK:  'border-purple-800/30 bg-purple-900/10 text-purple-400',
    BLOCKED:      'border-orange-800/30 bg-orange-900/10 text-[var(--warning)]',
    STOPPED:      'border-[var(--rail)]/50 bg-[var(--surface-2)]/20 text-[var(--text-muted)]',
  };

  const iconMap: Record<string, typeof AlertCircleIcon> = {
    FAILED: AlertCircleIcon,
    STOPPED: StopCircleIcon,
    ROLLED_BACK: RotateClockwiseIcon,
    BLOCKED: AlertCircleIcon,
  };

  return (
    <div className={`flex items-center gap-2.5 text-sm px-4 py-3 rounded-xl border ${stateStyles[status] ?? 'border-[var(--rail)]/50 bg-[var(--surface-2)]/20 text-[var(--text-muted)]'}`}>
      <HugeiconsIcon icon={iconMap[status] ?? AlertCircleIcon} size={18} />
      <span className="font-medium capitalize">{status?.toLowerCase().replace('_', ' ')}</span>
    </div>
  );
}
