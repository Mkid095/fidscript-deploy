'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';

export function LoginErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20"
    >
      <HugeiconsIcon
        icon={AlertCircleIcon}
        size={16}
        className="text-[var(--danger)] flex-shrink-0 mt-0.5"
      />
      <p className="text-sm text-[var(--danger)] leading-snug">{message}</p>
    </div>
  );
}
