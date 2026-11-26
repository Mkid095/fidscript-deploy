'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorState } from '@/components/ui/feedback';
import { passwordProblems } from './register-form';

/**
 * Choosing a new password.
 *
 * The token comes from the link in the email. It works once, and for an
 * hour — and using it ends every session on the account, including this one.
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This link is missing its token. Ask for a new one.');
      return;
    }
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      setError(`The password needs ${problems.join(', ')}.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await browserApi.post('/auth/password-reset', {
        token,
        newPassword: password,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'That link is no longer valid.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Your password is changed
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          Every session on this account was signed out — including this one.
          Sign in with the new password.
        </p>
        <div>
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Choose a new password
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          This link works once, and for an hour.
        </p>
      </div>

      <PasswordInput
        label="New password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="At least 12 characters, with an uppercase letter, a lowercase letter and a number"
        autoComplete="new-password"
        autoFocus
        required
      />

      <PasswordInput
        label="Confirm password"
        placeholder="••••••••"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        required
      />

      {error ? <ErrorState message={error} /> : null}

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
      >
        {submitting ? 'Saving…' : 'Set my password'}
      </Button>

      <p className="pt-1 text-center text-xs text-text-muted">
        <Link href="/login" className="transition hover:text-text">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
