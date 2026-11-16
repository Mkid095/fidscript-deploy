'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

/**
 * The second factor.
 *
 * The password was right — the platform issued a challenge instead of a
 * session, and the proxy kept that challenge in a cookie. This form sends
 * the code; the proxy attaches the challenge; the session lands in cookies.
 *
 * A **recovery code** works here too, for the person whose phone is gone.
 */
export function MfaChallengeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Enter the code from your authenticator.');
      return;
    }

    setSubmitting(true);
    try {
      await browserApi.post('/auth/mfa/challenge', { code: code.trim() });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'That code was not accepted.',
      );
      setCode('');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Two-factor authentication
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {useRecovery
            ? 'Enter one of your recovery codes.'
            : 'Enter the code from your authenticator app to finish signing in.'}
        </p>
      </div>

      <Input
        label={useRecovery ? 'Recovery code' : 'Code'}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder={useRecovery ? 'abcd1234-efgh56' : '123456'}
        autoComplete="one-time-code"
        inputMode={useRecovery ? 'text' : 'numeric'}
        autoFocus
        required
      />

      {error ? <ErrorState message={error} /> : null}

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
      >
        {submitting ? 'Checking…' : 'Verify'}
      </Button>

      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((value) => !value);
            setError(null);
            setCode('');
          }}
          className="text-text-muted transition hover:text-text"
        >
          {useRecovery ? 'Use your authenticator app' : 'Use a recovery code'}
        </button>
        <Link
          href="/login"
          className="text-text-muted transition hover:text-text"
        >
          Use a different account
        </Link>
      </div>
    </form>
  );
}
