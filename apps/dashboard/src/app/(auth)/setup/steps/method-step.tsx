'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { Card } from '@fidscript/ui';

type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

interface MethodStepProps {
  onSelect: (method: AuthMethod) => void;
}

export function MethodStep({ onSelect }: MethodStepProps) {
  return (
    <Card padding="lg">
      <h1 className="text-xl font-bold text-[var(--text)] mb-1">Platform Setup</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">Configure your platform to get started</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelect('MAGIC_CODE')}
          className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]/50 transition-all duration-200 text-left"
        >
          <HugeiconsIcon icon={Mail01Icon} size={28} className="text-[var(--accent)]" />
          <div>
            <p className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">Magic Code</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Email verification code each login — password-free
            </p>
            <span className="inline-block mt-2 text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect('PASSWORD')}
          className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]/50 transition-all duration-200 text-left"
        >
          <HugeiconsIcon icon={LockPasswordIcon} size={28} className="text-[var(--warning)]" />
          <div>
            <p className="font-semibold text-[var(--text)] group-hover:text-orange-300">Email + Password</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Traditional password-based login
            </p>
          </div>
        </button>
      </div>
    </Card>
  );
}
