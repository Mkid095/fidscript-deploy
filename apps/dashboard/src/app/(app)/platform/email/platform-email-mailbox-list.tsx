'use client';

import type { PlatformMailboxSummary } from '@fidscript-deploy/sdk';

interface Props {
  mailboxes: PlatformMailboxSummary[];
  selectedLocal: string | null;
  onSelect: (name: string) => void;
}

export function PlatformEmailMailboxList({ mailboxes, selectedLocal, onSelect }: Props) {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-1 overflow-y-auto">
      {mailboxes.map(mb => (
        <button
          key={mb.id}
          onClick={() => onSelect(mb.name)}
          className={`text-left p-3 rounded-lg border transition-colors ${
            selectedLocal === mb.name
              ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--text)]'
              : 'bg-[var(--surface-2)] border-[var(--rail)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
          }`}
        >
          <div className="text-sm font-medium truncate">{mb.name}</div>
          <div className="text-xs text-[var(--text-muted)] truncate font-mono">{mb.email}</div>
        </button>
      ))}
    </div>
  );
}
