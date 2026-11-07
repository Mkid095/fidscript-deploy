'use client';

import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, Database01Icon, Globe02Icon } from '@hugeicons/core-free-icons';

/**
 * Step one — what this is.
 *
 * Three sentences and three cards. An operator who does not know what the
 * platform is cannot decide what to make with it.
 */
export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Welcome to FIDScript
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          This platform runs the things you build: the applications, the data behind them and the
          names they answer to. Three minutes here, and you will have something running.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border border-[var(--rail)] p-4">
          <HugeiconsIcon icon={Rocket01Icon} size={18} className="text-[var(--accent)]" />
          <p className="mt-2 text-sm font-medium text-[var(--text)]">Ship an application</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Point it at a repository and it builds, runs and gives you a URL.
          </p>
        </Card>
        <Card className="border border-[var(--rail)] p-4">
          <HugeiconsIcon icon={Database01Icon} size={18} className="text-[var(--accent)]" />
          <p className="mt-2 text-sm font-medium text-[var(--text)]">Keep the data</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            A Postgres database per project, pooled, backed up, queryable from the console.
          </p>
        </Card>
        <Card className="border border-[var(--rail)] p-4">
          <HugeiconsIcon icon={Globe02Icon} size={18} className="text-[var(--accent)]" />
          <p className="mt-2 text-sm font-medium text-[var(--text)]">Give it a name</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Domains and certificates, or the subdomain the platform gives you.
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onNext}>Show me around</Button>
      </div>
    </div>
  );
}
