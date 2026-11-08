'use client';

import { useState } from 'react';
import Link from 'next/link';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Asking for a reset.
 *
 * The answer is the same whether or not the address has an account — that is
 * the platform's promise, and the form keeps it: it says what it did, not
 * what it found.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Enter the email address you signed up with.');
      return;
    }

    setSubmitting(true);
    try {
      await browserApi.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'The link could not be sent.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Check your inbox
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          If <span className="text-text">{email}</span> is registered on this
          platform, a reset link is on its way. The link works once, and for an
          hour.
        </p>
        <p className="text-xs text-text-dim">
          Nothing there? Check the spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-text-muted underline transition hover:text-text"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="inline-block text-xs text-text-muted transition hover:text-text"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          We will send you a link to choose a new one.
        </p>
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

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
      >
        {submitting ? 'Sending…' : 'Send the link'}
      </Button>

      <p className="pt-1 text-center text-xs text-text-muted">
        <Link href="/login" className="transition hover:text-text">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
