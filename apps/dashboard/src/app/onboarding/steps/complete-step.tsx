'use client';

import { Button, Badge } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon, Time01Icon } from '@hugeicons/core-free-icons';

interface CompleteStepProps {
  certPending?: boolean;
  onContinue: () => void;
}

export function CompleteStep({ certPending, onContinue }: CompleteStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] px-4 py-12">
      <div className="w-full max-w-[420px] text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 mb-6">
          <HugeiconsIcon
            icon={Tick02Icon}
            size={32}
            className="text-[var(--success)]"
          />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Platform configured
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          FIDScript is ready to use.
        </p>
        {certPending && (
          <div className="mt-4 inline-flex">
            <Badge variant="warning">
              <HugeiconsIcon icon={Time01Icon} size={12} />
              SSL provisioning — usually under 2 minutes
            </Badge>
          </div>
        )}
        <Button
          variant="primary"
          onClick={onContinue}
          className="w-full mt-8"
          size="md"
        >
          Go to login
        </Button>
      </div>
    </div>
  );
}
