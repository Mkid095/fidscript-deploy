'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';
import { passwordProblems } from './register-form';

/**
 * Changing the installer's password.
 *
 * The account was created with a password the installer printed once. It has
 * to be changed before the account is used for anything.
 */
export function ForceChangePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

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
      await browserApi.post('/auth/change-password', { currentPassword, newPassword: password });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The password could not be changed.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Choose a permanent password</h1>
        <p className="mt-1 text-sm text-text-muted">
          The password you signed up with was printed once by the installer. Replace it before you
          go any further.
        </p>
      </div>

      <Input
        label="Your current password"
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        autoComplete="current-password"
        autoFocus
        required
      />

      <Input
        label="New password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="At least 12 characters, with an uppercase letter, a lowercase letter and a number"
        autoComplete="new-password"
        required
      />

      <Input
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        autoComplete="new-password"
        required
      />

      {error ? <ErrorState message={error} /> : null}

      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        {submitting ? 'Saving…' : 'Set my password'}
      </Button>
    </form>
  );
}
