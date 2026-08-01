// Delete and Purge right panel components

import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { RightPanel, Input } from '@fidscript/ui';

import type { Project } from '@/types';

interface DeletePanelProps {
  deleting: Project | null;
  deleteAck: boolean;
  deletingNow: boolean;
  deleteError: string | null;
  onAckChange: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePanel({ deleting, deleteAck, deletingNow, deleteError, onAckChange, onConfirm, onCancel }: DeletePanelProps) {
  return (
    <RightPanel isOpen={!!deleting} onClose={onCancel} title="Delete project?"
      footer={{ onCancel, onSubmit: onConfirm, submitLabel: 'Delete project', loading: deletingNow, submitDisabled: !deleteAck, submitDanger: true, hideCancel: false }}>
      {deleting && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            You are about to permanently delete <strong className="text-[var(--text)]">{deleting.name}</strong>.
            This will remove the project and all data, which cannot be recovered:
          </p>
          <ul className="space-y-1.5 text-sm text-[var(--text-muted)] ml-1">
            {[
              'Deployments and release history',
              'Environment variables and secrets',
              'Database instances and backups',
              'Storage buckets and uploaded files',
              'Email mailboxes, aliases, and messages',
              'Custom domains and DNS records',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-[var(--danger)] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-2 pt-3 border-t border-[var(--rail)] cursor-pointer">
            <input type="checkbox" checked={deleteAck} onChange={e => onAckChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--rail-light)] bg-[var(--surface-2)] text-[var(--danger)] focus:ring-[var(--danger)] focus:ring-offset-0" />
            <span className="text-sm text-[var(--text-muted)]">
              I understand this will permanently delete <strong className="text-[var(--text)]">{deleting.name}</strong> and all of its data.
            </span>
          </label>
          {deleteError && <p className="text-sm text-[var(--danger)]">{deleteError}</p>}
        </div>
      )}
    </RightPanel>
  );
}

interface PurgePanelProps {
  purgeProject: Project | null;
  purgeCode: string;
  purgeRequested: boolean;
  purgeVerifying: boolean;
  purgeError: string | null;
  onCodeChange: (v: string) => void;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurgePanel({ purgeProject, purgeCode, purgeRequested, purgeVerifying, purgeError, onCodeChange, onRequest, onConfirm, onCancel }: PurgePanelProps) {
  return (
    <RightPanel isOpen={!!purgeProject} onClose={onCancel} title="Permanently delete?"
      footer={{ onCancel, onSubmit: purgeRequested ? onConfirm : onRequest,
        submitLabel: purgeRequested ? 'Delete permanently' : 'Send verification code',
        loading: purgeVerifying, submitDisabled: purgeRequested && !purgeCode.trim(), submitDanger: true, hideCancel: false }}>
      {purgeProject && (
        <div className="space-y-4">
          {!purgeRequested ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                Permanently deleting <strong className="text-[var(--text)]">{purgeProject.name}</strong> cannot be undone.
                A verification code will be sent to your email address.
              </p>
              <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg p-3 text-xs text-[var(--warning)]">
                This project will be permanently removed along with all deployments, databases, and storage.
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)]">
                A verification code was sent to your email. Enter it below to confirm permanent deletion of{' '}
                <strong className="text-[var(--text)]">{purgeProject.name}</strong>.
              </p>
              <Input label="Verification code" value={purgeCode} onChange={e => onCodeChange(e.target.value)}
                placeholder="000000" autoFocus
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] font-mono text-center text-lg tracking-widest" />
              <p className="text-xs text-[var(--text-muted)]">
                Didn&apos;t receive it?{' '}
                <button onClick={onRequest} disabled={purgeVerifying}
                  className="text-[var(--accent)] hover:text-[var(--accent)] underline disabled:opacity-50">
                  Resend
                </button>
              </p>
            </>
          )}
          {purgeError && <p className="text-sm text-[var(--danger)]">{purgeError}</p>}
        </div>
      )}
    </RightPanel>
  );
}
