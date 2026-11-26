'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Confirming an email address.
 *
 * The link carries a token; the platform checks it and marks the address
 * verified. When the link is old or already used, a new one can be sent.
 */
export function VerifyEmailPanel() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<'checking' | 'verified' | 'failed'>(
    'checking',
  );
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setState('failed');
        setMessage('This link is missing its token. Ask for a new one below.');
        return;
      }
      try {
        await browserApi.post('/auth/verify-email', { token });
        if (!cancelled) setState('verified');
      } catch (err) {
        if (cancelled) return;
        setState('failed');
        setMessage(
          err instanceof Error ? err.message : 'That link is no longer valid.',
        );
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function resend() {
    if (!email.trim()) {
      setMessage('Enter the email address you signed up with.');
      return;
    }
    try {
      await browserApi.post('/auth/send-verification', {
        email: email.trim(),
        type: 'EMAIL_VERIFY',
      });
      setResent(true);
      setMessage('');
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'The link could not be sent.',
      );
    }
  }

  if (state === 'checking') {
    return <p className="text-sm text-text-muted">Checking your link…</p>;
  }

  if (state === 'verified') {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Your email is confirmed
        </h1>
        <p className="text-sm text-text-muted">
          The address is verified, and the account is ready.
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Confirm your email
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          That link could not confirm the address — a new one can.
        </p>
      </div>
      {message ? <ErrorState message={message} /> : null}
      {resent ? (
        <p className="text-sm text-text-muted">
          If that address has an account, a new link is on its way.
        </p>
      ) : (
        <div className="space-y-3">
          <Input
            label="Send a new link to"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
          />
          <Button variant="primary" onClick={resend} className="w-full">
            Send it again
          </Button>
        </div>
      )}
      <p className="pt-1 text-center text-xs text-text-muted">
        <Link href="/login" className="transition hover:text-text">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
