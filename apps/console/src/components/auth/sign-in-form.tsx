'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { CodeInput } from '@/components/ui/code-input';
import { Segmented } from '@/components/ui/segmented';
import { ErrorState } from '@/components/ui/feedback';

type Mode = 'password' | 'code';

/**
 * Signing in.
 *
 * Two ways in, one answer. The answer comes back with the session in
 * **cookies** — the proxy takes the tokens out of the body — so this form
 * never holds a credential.
 *
 * By **password**, the old way. By **code**, the passwordless one: the
 * platform emails a six-digit code and signs the person in with it; an
 * account with a second factor gets the challenge either way, because a
 * code read off somebody else's mailbox is one factor, not two.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  /** The code was sent; the screen now waits for it to be read. */
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setCode('');
    setCodeSent(false);
  };

  /** The email is the request; the code is the answer. */
  async function sendCode() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address and we will send the code there.');
      return;
    }
    setBusy(true);
    try {
      await browserApi.post('/auth/magic-code', { email: email.trim() });
      setCodeSent(true);
      setCode('');
      setBusy(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The code could not be sent.',
      );
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // The code, not yet sent: the email is the request.
    if (mode === 'code' && !codeSent) {
      await sendCode();
      return;
    }

    // The code, in the hand: exchange it for the session.
    if (mode === 'code') {
      if (code.length !== 6) {
        setError('Enter the six-digit code from the email.');
        return;
      }
      setBusy(true);
      try {
        const result = await browserApi.post<{ mfaRequired?: boolean }>(
          '/auth/verify-magic-code',
          { email: email.trim(), code },
        );
        if (result.mfaRequired) {
          router.push(`/login/mfa?next=${encodeURIComponent(next)}`);
          return;
        }
        router.replace(next);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'That code was not accepted.',
        );
        setCode('');
        setBusy(false);
      }
      return;
    }

    // The password, the old way.
    if (!email.trim() || !password) {
      setError('Enter your email address and your password.');
      return;
    }

    setBusy(true);
    try {
      const result = await browserApi.post<{ mfaRequired?: boolean }>(
        '/auth/login',
        {
          email: email.trim(),
          password,
        },
      );

      if (result.mfaRequired) {
        router.push(`/login/mfa?next=${encodeURIComponent(next)}`);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
      setBusy(false);
    }
  }

  const submitLabel =
    mode === 'code'
      ? codeSent
        ? 'Sign in with the code'
        : 'Send the code'
      : 'Sign in';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-text-muted">To your platform.</p>
      </div>

      <Segmented
        ariaLabel="How to sign in"
        value={mode}
        onChange={(nextMode) => switchMode(nextMode)}
        options={[
          { value: 'password', label: 'Password' },
          { value: 'code', label: 'Sign in with a code' },
        ]}
      />

      <div key={mode} className="panel-enter space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          autoFocus={mode === 'password'}
          required
        />

        {mode === 'password' ? (
          <PasswordInput
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        ) : null}

        {mode === 'code' && codeSent ? (
          <>
            <p className="text-xs leading-relaxed text-text-muted">
              The code is on its way to <span className="text-text">{email}</span>
              . It works for ten minutes.
            </p>
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-muted">
                The six-digit code
              </p>
              <CodeInput
                value={code}
                onChange={setCode}
                autoFocus
                disabled={busy}
                label="The sign-in code"
              />
            </div>
          </>
        ) : null}

        {error ? <ErrorState message={error} /> : null}

        <Button
          type="submit"
          variant="primary"
          loading={busy}
          className="w-full"
        >
          {busy
            ? mode === 'code' && !codeSent
              ? 'Sending…'
              : 'Signing in…'
            : submitLabel}
        </Button>

        {mode === 'code' && codeSent ? (
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="w-full text-center text-xs text-text-muted transition hover:text-text disabled:opacity-50"
          >
            Nothing arrived? Send it again
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <Link
          href="/forgot-password"
          className="text-text-muted transition hover:text-text"
        >
          Forgotten your password?
        </Link>
        <Link
          href="/register"
          className="text-text-muted transition hover:text-text"
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}
