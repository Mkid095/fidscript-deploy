'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface AuthMethodToggleProps {
  value: AuthMethod;
  onChange: (v: AuthMethod) => void;
}

export function AuthMethodToggle({ value, onChange }: AuthMethodToggleProps) {
  return (
    <div className="flex rounded-lg bg-[var(--surface-2)] p-1 mb-6 border border-[var(--rail-light)]">
      <button
        type="button"
        onClick={() => onChange('PASSWORD')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
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
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
          value === 'MAGIC_CODE'
            ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        }`}
      >
        <HugeiconsIcon icon={Mail01Icon} size={14} />Magic code
      </button>
    </div>
  );
}
