'use client';

import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

interface CompleteStepProps {
  certPending?: boolean;
  onContinue: () => void;
}

export function CompleteStep({ certPending, onContinue }: CompleteStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)] text-center">
        <div className="text-4xl mb-4"></div>
        <div className="text-lg font-semibold text-[var(--text)] mb-1">Platform configured</div>
        <div className="text-sm text-[var(--text-muted)] mb-2">FIDScript is ready.</div>
        {certPending && (
          <div className="text-xs text-[var(--warning)] mb-4">
            SSL certificate is being provisioned — this usually takes under 2 minutes.
          </div>
        )}
        <Button variant="primary" onClick={onContinue} className="w-full">
          Go to login
        </Button>
      </Card>
    </div>
  );
}
