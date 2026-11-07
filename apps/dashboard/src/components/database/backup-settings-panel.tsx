'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { HardDriveIcon, AlertCircleIcon } from '@hugeicons/core-free-icons';

/**
 * The database's backups.
 *
 * **Scheduled backups are not available on this platform yet.** The form
 * that used to be here asked the API for a schedule the API never had —
 * every save answered 404 — and promised a "next run" that nothing would
 * ever honour. A control that cannot work is worse than a control that
 * says so, so the tab says what is true and points at what does work.
 */
export function BackupSettingsPanel() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={HardDriveIcon} size={18} className="text-[var(--text-dim)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Backups</h2>
      </div>

      <div className="flex items-start gap-2 rounded border border-[var(--rail)] p-4 text-xs text-[var(--text-muted)]">
        <HugeiconsIcon icon={AlertCircleIcon} size={14} className="flex-shrink-0 mt-0.5 text-[var(--text-dim)]" />
        <span>
          <span className="font-semibold text-[var(--text)]">Scheduled backups are not available yet.</span>{' '}
          The platform takes a backup when you ask it to, and keeps the ones you take — but it does
          not yet run a backup on a schedule. Take one from the database&apos;s{' '}
          <span className="font-mono">Backups</span> section, and restore from there.
        </span>
      </div>
    </div>
  );
}
