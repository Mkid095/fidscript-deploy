'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';

type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

interface AuthMethodBadgeProps {
  method: AuthMethod;
}

export function AuthMethodBadge({ method }: AuthMethodBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
      method === 'PASSWORD'
        ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]'
        : 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
    }`}>
      <HugeiconsIcon icon={method === 'PASSWORD' ? LockPasswordIcon : Mail01Icon} size={12} />
      {method === 'PASSWORD' ? 'Email + Password' : 'Magic Code'}
    </span>
  );
}
