'use client';

/**
 * Confirming an email address.
 *
 * The API sends the link; there was no page for it to land on.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthPageShell } from '../login/components/auth-page-shell';
import { LoginErrorBanner } from '../login/components/login-error-banner';
import { Button, Input } from '@fidscript/ui';
import { makeSdk } from '@/lib/sdk';

type State = 'checking' | 'verified' | 'failed';

function VerifyEmailPageInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<State>('checking');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = useCallback(async () => {
    if (!token) {
      setState('failed');
      setError('This link is missing its token — ask for a new one.');
      return;
    }
    setState('checking');
    try {
      const sdk = makeSdk();
      await sdk.auth.verifyEmail(token);
      setState('verified');
    } catch (err) {
      setState('failed');
      setError(err instanceof Error ? err.message : 'That link is no longer valid');
    }
  }, [token]);

  useEffect(() => { void verify(); }, [verify]);

  async function handleResend() {
    if (!email.trim()) { setError('Enter the email address you signed up with'); return; }
    setResending(true);
    try {
      const sdk = makeSdk();
      await sdk.auth.sendVerification(email, 'EMAIL_VERIFY');
      setResent(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email');
    } finally {
      setResending(false);
    }
  }

  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
        Back to sign in
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Confirm your email"
      subtitle="We sent a link to your address. Open it and your account is confirmed."
      footer={footer}
    >
      {state === 'checking' && (
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">Checking your link…</p>
      )}

      {state === 'verified' && (
        <div className="flex flex-col items-center gap-4 text-center py-4">
          <p className="text-sm font-medium text-[var(--text)]">Your email is confirmed</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      )}

      {state === 'failed' && (
        <div className="flex flex-col gap-4">
          <LoginErrorBanner message={error} />
          {resent ? (
            <p className="text-sm text-[var(--text-muted)]">
              If that address has an account, we sent a new link.
            </p>
          ) : (
            <>
              <Input
                label="Send a new link"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Button variant="secondary" onClick={handleResend} loading={resending}>
                Send it again
              </Button>
            </>
          )}
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
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)] p-6">Checking…</p>}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
