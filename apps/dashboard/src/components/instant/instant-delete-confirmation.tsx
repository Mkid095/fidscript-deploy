'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';

interface InstantDeleteConfirmationProps {
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Deleting an Instant app removes the project's data plane — every table,
 * every user, every permission rule. The wording says so in those words.
 */
export function InstantDeleteConfirmation({
  title,
  deleting,
  onCancel,
  onConfirm,
}: InstantDeleteConfirmationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !deleting && onCancel()}
      />
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-[var(--rail)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--rail)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Delete Instant app</h2>
          <button
            onClick={() => !deleting && onCancel()}
            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)] transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-[var(--text-dim)]">
            Are you sure you want to delete{' '}
            <span className="font-medium text-[var(--text)]">{title}</span>?
          </p>
          <p className="text-xs text-[var(--text-dim)]">
            This removes the app from Instant and everything in it — its tables,
            its users and its permission rules. It cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onConfirm}
              disabled={deleting}
              className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            >
              {deleting ? 'Deleting…' : 'Delete app'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
