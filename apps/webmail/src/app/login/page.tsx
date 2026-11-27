'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Button,
  Card,
  ErrorState,
  Field,
  PasswordInput,
  TextInput,
} from '@/components/ui';

/**
 * Sign in.
 *
 * One form, two kinds of credential: the platform admin's, or a mailbox's
 * own (verified against Stalwart, not stored here). The answer comes back
 * as a session cookie; the screen moves to the dashboard, or stays and says
 * why.
 *
 * The screen is the platform's own sign-in: the mark on the bar, one card
 * that settles, the error shown as a state — so a person who knows the
 * console knows this one without being told.
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
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-rail px-4 py-4 sm:px-6">
        <Brand href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <Card className="panel-enter p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-text">
              Sign in
            </h1>
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
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              {error ? <ErrorState message={error} /> : null}
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                className="w-full"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>
          <p className="mt-6 text-center text-xs text-text-dim">
            The mail platform, on your own hardware.
          </p>
        </div>
      </main>
    </div>
  );
}
