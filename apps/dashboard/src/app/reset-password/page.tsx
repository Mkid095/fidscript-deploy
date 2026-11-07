'use client';

/**
 * Choosing a new password.
 *
 * The API has had this endpoint for a long time and the dashboard had no
 * screen for it — so the link in the reset email landed on a 404, and the
 * flow it belonged to could not be finished.
 */
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthPageShell } from '../login/components/auth-page-shell';
import { LoginErrorBanner } from '../login/components/login-error-banner';
import { Button, Input } from '@fidscript/ui';
import { PasswordStrength } from '@/components/auth/password-strength';
import { makeSdk } from '@/lib/sdk';
import { PASSWORD_POLICY_MESSAGE, isPasswordAcceptable } from '@/lib/password-policy';

function ResetPasswordPageInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) { setError('This link is missing its token — ask for a new one.'); return; }
    if (!isPasswordAcceptable(password)) { setError(PASSWORD_POLICY_MESSAGE); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const sdk = makeSdk();
      await sdk.auth.confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That link is no longer valid');
    } finally {
      setLoading(false);
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
      title="Choose a new password"
      subtitle="This link works once, and for the next hour."
      footer={footer}
      maxWidth="480"
    >
      {done ? (
        <div className="flex flex-col items-center gap-4 text-center py-4">
          <p className="text-sm font-medium text-[var(--text)]">Your password is changed</p>
          <p className="text-sm text-[var(--text-muted)]">
            Every session on this account was signed out — including this one.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoComplete="new-password"
            hint={PASSWORD_POLICY_MESSAGE}
          />
          <PasswordStrength password={password} />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            autoComplete="new-password"
          />
          {error && <LoginErrorBanner message={error} />}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Set my password'}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}

/**
 * The page reads the token from the address, so it is rendered inside a
 * boundary — Next cannot prerender a page whose query string it does not
 * know at build time.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)] p-6">Checking…</p>}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
