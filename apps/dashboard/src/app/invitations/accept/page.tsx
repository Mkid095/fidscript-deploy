'use client';
/* eslint-disable import/order */

import { HugeiconsIcon } from '@hugeicons/react';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

type Status = 'loading' | 'accepting' | 'success' | 'error' | 'unauthenticated';

function AcceptInvitationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getSdk, user } = useAuth();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setStatus('error');
      return;
    }

    if (!user) {
      const next = `/invitations/accept?token=${encodeURIComponent(token)}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setStatus('accepting');

    getSdk().projects.acceptInvitation(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'This invitation is no longer valid or has expired.');
        setStatus('error');
      });
  }, [token, user, getSdk, router]);

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card padding="lg" className="w-full max-w-sm border border-[var(--rail)] text-center">
          <div className="mb-4">
            <Spinner size="lg" className="mx-auto" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {status === 'loading' ? 'Loading invitation…' : 'Accepting invitation…'}
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card padding="lg" className="w-full max-w-sm border border-[var(--rail)] text-center">
          <div className="text-4xl mb-4"></div>
          <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Invitation not accepted</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">{error}</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-sm border border-[var(--success)]/30 text-center">
        <div className="text-4xl mb-4"></div>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-2">You&apos;ve joined the project!</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Redirecting to your dashboard…</p>
        <Spinner size="sm" className="mx-auto" />
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card padding="lg" className="w-full max-w-sm border border-[var(--rail)] text-center">
          <div className="mb-4">
            <Spinner size="lg" className="mx-auto" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">Loading invitation…</p>
        </Card>
      </div>
    }>
      <AcceptInvitationInner />
    </Suspense>
  );
}
