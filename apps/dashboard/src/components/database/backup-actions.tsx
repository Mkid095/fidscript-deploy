'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Link01Icon, Download01Icon,
} from '@hugeicons/core-free-icons';

interface BackupActionsProps {
  backupId: string;
  url?: string | null;
  status: string;
  restoring: string | null;
  onRestore: (id: string) => void;
  onCopyUrl: (url: string) => void;
}

export function BackupActions({ backupId, url, status, restoring, onRestore, onCopyUrl }: BackupActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {url && (
        <button
          onClick={() => onCopyUrl(url)}
          title="Copy download URL"
          className="p-1 rounded text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]"
        >
          <HugeiconsIcon icon={Link01Icon} size={13} />
        </button>
      )}
      {status === 'completed' && (
        <button
          onClick={() => onRestore(backupId)}
          disabled={restoring !== null}
          title="Restore this backup"
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] disabled:opacity-40"
        >
          <HugeiconsIcon icon={Download01Icon} size={12} />
          {restoring === backupId ? 'Restoring…' : 'Restore'}
        </button>
      )}
    </div>
  );
}
