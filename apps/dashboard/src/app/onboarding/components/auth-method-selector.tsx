'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface AuthMethodSelectorProps {
  value: AuthMethod;
  onChange: (value: AuthMethod) => void;
}

export function AuthMethodSelector({ value, onChange }: AuthMethodSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
        Login method
      </label>
      <div className="flex p-1 bg-[var(--surface-2)] rounded-lg border border-[var(--rail-light)]">
        <button
          type="button"
          onClick={() => onChange('PASSWORD')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
            value === 'PASSWORD'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <HugeiconsIcon icon={LockPasswordIcon} size={14} />Password
        </button>
        <button
          type="button"
          onClick={() => onChange('MAGIC_CODE')}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
            value === 'MAGIC_CODE'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <HugeiconsIcon icon={Mail01Icon} size={14} />Magic code
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-dim)]">
        {value === 'PASSWORD'
          ? 'Admin logs in with email and password.'
          : 'Admin receives a one-time code via email.'}
      </p>
    </div>
  );
}
