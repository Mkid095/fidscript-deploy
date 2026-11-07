'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Signing in.
 *
 * The answer comes back with the session in **cookies** — the proxy takes
 * the tokens out of the body — so this form never holds a credential.
 *
 * When the account has a second factor, the answer is `mfaRequired` and the
 * person goes on to the challenge.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email address and your password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await browserApi.post<{ mfaRequired?: boolean }>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (result.mfaRequired) {
        router.push(`/login/mfa?next=${encodeURIComponent(next)}`);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">To your platform.</p>
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        autoComplete="username"
        autoFocus
        required
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      {error ? <ErrorState message={error} /> : null}

      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <Link href="/forgot-password" className="text-text-muted transition hover:text-text">
          Forgotten your password?
        </Link>
        <Link href="/register" className="text-text-muted transition hover:text-text">
          Create an account
        </Link>
      </div>
    </form>
  );
}
