'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CircleMinusIcon } from '@hugeicons/core-free-icons';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-[var(--rail)] text-[var(--text-dim)] border border-[var(--rail)]'
    }`}>
      <HugeiconsIcon
        icon={isActive ? CheckmarkCircle01Icon : CircleMinusIcon}
        size={10}
        className={isActive ? 'text-emerald-400' : 'text-[var(--text-dim)]'}
      />
      {status}
    </span>
  );
}
