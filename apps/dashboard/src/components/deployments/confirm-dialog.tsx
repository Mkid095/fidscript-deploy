'use client';

import { useState } from 'react';
import { Button, Spinner } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  confirmWord?: string;
}

export function ConfirmDialog({ title, message, confirmLabel, variant, onConfirm, onClose, loading, confirmWord = 'delete' }: ConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  const isDanger = variant === 'danger';
  const isConfirmed = isDanger ? confirmText === confirmWord : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] border border-[var(--rail)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <DialogHeader title={title} message={message} variant={variant} />
        {isDanger && (
          <DangerConfirmInput confirmText={confirmText} onChange={setConfirmText} confirmWord={confirmWord} />
        )}
        <DialogActions
          variant={variant}
          confirmLabel={confirmLabel}
          isConfirmed={isConfirmed}
          onConfirm={onConfirm}
          onClose={onClose}
          loading={loading}
        />
      </div>
    </div>
  );
}

function DialogHeader({ title, message, variant }: { title: string; message: string; variant: string }) {
  const isDanger = variant === 'danger';
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isDanger ? 'bg-[var(--danger)]/10' : 'bg-[var(--warning)]/10'
      }`}>
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={20}
          className={isDanger ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}
        />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function DangerConfirmInput({ confirmText, onChange, confirmWord }: { confirmText: string; onChange: (v: string) => void; confirmWord: string }) {
  return (
    <input
      value={confirmText}
      onChange={e => onChange(e.target.value)}
      placeholder={`Type "${confirmWord}" to confirm`}
      className="w-full px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--danger)] transition-colors"
      autoFocus
    />
  );
}

function DialogActions({
  variant,
  confirmLabel,
  isConfirmed,
  onConfirm,
  onClose,
  loading,
}: {
  variant: 'danger' | 'warning';
  confirmLabel: string;
  isConfirmed: boolean;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        size="sm"
        disabled={variant === 'danger' && !isConfirmed || loading}
        onClick={onConfirm}
      >
        {loading ? <Spinner size="sm" /> : confirmLabel}
      </Button>
    </div>
  );
}
