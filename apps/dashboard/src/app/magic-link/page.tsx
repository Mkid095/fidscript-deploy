'use client';

/**
 * A magic sign-in link.
 *
 * The platform's usual way in is a typed code, but the API also sends a
 * link. There was no page for it — the link landed on a 404.
 */
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthPageShell } from '../login/components/auth-page-shell';
import { LoginErrorBanner } from '../login/components/login-error-banner';
import { makeSdk } from '@/lib/sdk';
import { storeTokens } from '@/contexts/auth-token-utils';

function MagicLinkPageInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      if (!token) {
        setError('This link is missing its token.');
        return;
      }
      try {
        const sdk = makeSdk();
        const res = await sdk.auth.confirmMagicLink(token);
        if (cancelled) return;
        storeTokens(res.accessToken, res.refreshToken);
        window.location.href = '/overview';
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'That link is no longer valid');
      }
    }

    void confirm();
    return () => { cancelled = true; };
  }, [token]);

  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
        Sign in with a code instead
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Signing you in"
      subtitle="One moment."
      footer={footer}
    >
      {!error ? (
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">Checking your link…</p>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <LoginErrorBanner message={error} />
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:opacity-90"
          >
            Go to sign in
          </Link>
        </div>
      )}
    </AuthPageShell>
  );
}

/**
 * The page reads the token from the address, so it is rendered inside a
 * boundary — Next cannot prerender a page whose query string it does not
 * know at build time.
 */
export default function MagicLinkPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)] p-6">Checking…</p>}>
      <MagicLinkPageInner />
    </Suspense>
  );
}
