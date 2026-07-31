'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { Card } from '@fidscript/ui';

interface DoneStepProps {
  domain: string;
}

export function DoneStep({ domain }: DoneStepProps) {
  return (
    <Card padding="lg" className="text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={36} className="text-green-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-1">Setup complete!</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Your platform is ready at{' '}
            <a
              href={`https://${domain}`}
              className="text-[var(--accent)] hover:text-[var(--accent)] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://{domain}
            </a>
          </p>
        </div>

        <a
          href={`https://${domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-[var(--success)] hover:bg-[var(--success)]/90 text-[var(--text)] px-6 py-3 text-base transition-colors duration-200 mt-2"
        >
          Visit your dashboard
          <span aria-hidden="true">→</span>
        </a>

        <p className="text-xs text-[var(--text-dim)] max-w-xs">
          This link is your permanent access point. The IP-based URL will redirect here from now on.
        </p>
      </div>
    </Card>
  );
}
