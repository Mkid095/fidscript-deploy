'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';

interface LogToggleProps {
  expanded: boolean;
  onToggle: () => void;
  filteredLength: number;
  inFlight: boolean;
}

export function LogToggle({ expanded, onToggle, filteredLength, inFlight }: LogToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface-2)]/50 border-t border-[var(--rail)] text-xs text-[var(--text-muted)] hover:bg-[var(--rail)]/20 transition-colors text-left"
    >
      <span>
        {inFlight && filteredLength === 0
          ? 'Streaming build output…'
          : `${filteredLength} log line${filteredLength === 1 ? '' : 's'}`}
      </span>
      <HugeiconsIcon icon={expanded ? ArrowUp01Icon : ArrowDown01Icon} size={12} className="text-[var(--text-dim)]" />
    </button>
  );
}
