'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon, AlertCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  success?: string | null;
  loading?: boolean;
  successIcon?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  success,
  loading,
  successIcon,
  children,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
        {loading && (
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
            checking
          </span>
        )}
        {!loading && successIcon && (
          <HugeiconsIcon
            icon={Tick02Icon}
            size={14}
            className="text-[var(--success)]"
          />
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--danger)] flex items-center gap-1">
          <HugeiconsIcon icon={AlertCircleIcon} size={12} />
          {error}
        </p>
      ) : success && !error ? (
        <p className="mt-1.5 text-xs text-[var(--success)] flex items-center gap-1">
          <HugeiconsIcon icon={Tick02Icon} size={12} />
          {success}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--text-dim)]">{hint}</p>
      ) : null}
    </div>
  );
}

export const formInputClass =
  'w-full bg-[var(--surface-2)] border border-[var(--rail-light)] text-[var(--text)] rounded-lg px-3 py-2.5 text-sm ' +
  'placeholder:text-[var(--text-dim)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] ' +
  'transition-colors';
