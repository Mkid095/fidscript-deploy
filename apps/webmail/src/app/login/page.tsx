'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorNote, Field, PrimaryButton, TextInput } from '@/components/ui';

/**
 * Sign in.
 *
 * One form, two kinds of credential: the platform admin's, or a mailbox's
 * own (verified against Stalwart, not stored here). The answer comes back
 * as a session cookie; the screen moves to the dashboard, or stays and says
 * why.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (response.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setError(body?.error ?? 'Sign in did not work. Try again.');
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-lg font-semibold text-text">Sign in</h1>
      <p className="mt-1 text-sm text-text-muted">
        The platform admin, or your own mailbox.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </PrimaryButton>
      </form>
    </main>
  );
}
