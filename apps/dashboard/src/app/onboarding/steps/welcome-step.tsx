'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@fidscript/ui';

interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  const [lifecycle, setLifecycle] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/v1/installation/status');
        if (res.ok) {
          const data = await res.json() as { lifecycle?: string };
          if (data.lifecycle === 'CONFIGURED') setLifecycle('CONFIGURED');
        }
      } catch { /* ignore */ }
    }
    check();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] px-4 py-12">
      <div className="w-full max-w-[420px] text-center">
        {lifecycle === 'CONFIGURED' ? (
          <>
            <Badge variant="success" className="mb-6">Platform ready</Badge>
            <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
              FIDScript is already configured
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Your platform is up and running.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => window.location.href = '/login'}
              className="w-full mt-8"
            >
              Go to login
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight">
              FIDScript
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Self-hosted deployment platform
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={onStart}
              className="w-full mt-8"
            >
              Create a new platform
            </Button>
          </>
        )}
        <p className="mt-6 text-xs text-[var(--text-dim)]">
          Need help?{' '}
          <Link href="/docs" className="text-[var(--accent)] hover:underline font-medium">
            View the docs
          </Link>
        </p>
      </div>
    </div>
  );
}
