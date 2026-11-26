'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button, Spinner } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Signing in from a magic link.
 *
 * The link carries a token; the platform turns it into a session, and the
 * proxy puts the session in cookies like any other sign-in.
 */
export function MagicLinkPanel() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function signIn() {
      if (!token) {
        setError('This link is missing its token.');
        return;
      }
      try {
        await browserApi.post('/auth/magic-link/verify', { token });
        if (!cancelled) window.location.replace('/overview');
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'That link is no longer valid.',
          );
        }
      }
    }

    void signIn();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          That link has expired
        </h1>
        <ErrorState message={error} />
        <div>
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4 text-sm text-text-muted">
      <Spinner />
      <span className="ml-2">Signing you in…</span>
    </div>
  );
}
