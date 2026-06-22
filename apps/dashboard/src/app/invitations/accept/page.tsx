'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

type Status = 'loading' | 'accepting' | 'success' | 'error' | 'unauthenticated';

export default function AcceptInvitationPage() {
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
      // Redirect to login, returning here after auth
      const next = `/invitations/accept?token=${encodeURIComponent(token)}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    // User is authed — accept the invitation
    setStatus('accepting');

    getSdk().projects.acceptInvitation(token)
      .then(() => {
        setStatus('success');
        // Project name is not in the accept response; fetch it after redirect
        setTimeout(() => router.push('/'), 2000);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'This invitation is no longer valid or has expired.');
        setStatus('error');
      });
  }, [token, user, getSdk, router]);

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <Card padding="lg" className="w-full max-w-sm border border-[#1e2130] text-center">
          <div className="mb-4">
            <Spinner size="lg" className="mx-auto" />
          </div>
          <p className="text-sm text-slate-400">
            {status === 'loading' ? 'Loading invitation…' : 'Accepting invitation…'}
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <Card padding="lg" className="w-full max-w-sm border border-[#1e2130] text-center">
          <div className="text-4xl mb-4">✗</div>
          <h1 className="text-lg font-semibold text-slate-200 mb-2">Invitation not accepted</h1>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <Button variant="primary" onClick={() => router.push('/')}>
            Go to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // success
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-sm border border-emerald-800 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-lg font-semibold text-slate-200 mb-2">You&apos;ve joined the project!</h1>
        <p className="text-sm text-slate-400 mb-6">Redirecting to your dashboard…</p>
        <Spinner size="sm" className="mx-auto" />
      </Card>
    </div>
  );
}
