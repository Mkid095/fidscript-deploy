'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@fidscript/ui';

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

  if (lifecycle === 'CONFIGURED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">FIDScript</h1>
          <p className="text-[var(--text-muted)] mb-8">Platform is already configured.</p>
          <Button variant="primary" size="lg" onClick={() => window.location.href = '/login'} className="w-full mb-4">
            Go to login
          </Button>
          <p className="text-xs text-[var(--text-dim)]">
            Need help? <Link href="/docs" className="text-[var(--accent)] hover:text-[var(--accent)]">View the docs</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">FIDScript</h1>
        <p className="text-[var(--text-muted)] mb-8">Self-hosted deployment platform</p>
        <Button variant="primary" size="lg" onClick={onStart} className="w-full mb-4">
          Create a new platform
        </Button>
        <p className="text-xs text-[var(--text-dim)]">
          Need help? <Link href="/docs" className="text-[var(--accent)] hover:text-[var(--accent)]">View the docs</Link>
        </p>
      </div>
    </div>
  );
}
