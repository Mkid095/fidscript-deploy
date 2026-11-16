'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';

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
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          Sign in with a code
        </Link>
      </div>
    );
  }

  return <p className="text-sm text-text-muted">Signing you in…</p>;
}
