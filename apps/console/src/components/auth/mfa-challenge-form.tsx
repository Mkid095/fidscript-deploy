'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeInput } from '@/components/ui/code-input';
import { Segmented } from '@/components/ui/segmented';
import { ErrorState } from '@/components/ui/feedback';

type Kind = 'code' | 'recovery';

/**
 * The second factor.
 *
 * The password was right — the platform issued a challenge instead of a
 * session, and the proxy kept that challenge in a cookie. This form sends
 * the code; the proxy attaches the challenge; the session lands in cookies.
 *
 * A **recovery code** works here too, for the person whose phone is gone:
 * one of the twelve the account printed the day it enrolled.
 */
export function MfaChallengeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [kind, setKind] = useState<Kind>('code');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchKind = (nextKind: Kind) => {
    setKind(nextKind);
    setError(null);
    setCode('');
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError(
        kind === 'recovery'
          ? 'Enter one of your recovery codes.'
          : 'Enter the code from your authenticator app.',
      );
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
          {kind === 'recovery'
            ? 'Enter one of your recovery codes.'
            : 'Enter the code from your authenticator app to finish signing in.'}
        </p>
      </div>

      <Segmented
        ariaLabel="How to verify"
        value={kind}
        onChange={switchKind}
        options={[
          { value: 'code', label: 'Code' },
          { value: 'recovery', label: 'Recovery code' },
        ]}
      />

      <div key={kind} className="panel-enter">
        {kind === 'code' ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Code</p>
            <CodeInput
              value={code}
              onChange={setCode}
              autoFocus
              disabled={submitting}
              label="The two-factor code"
            />
          </div>
        ) : (
          <Input
            label="Recovery code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="abcd1234-efgh56"
            autoComplete="off"
            inputMode="text"
            autoFocus
            required
          />
        )}
      </div>

      {error ? <ErrorState message={error} /> : null}

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full"
      >
        {submitting ? 'Checking…' : 'Verify'}
      </Button>

      <p className="pt-1 text-center text-xs text-text-muted">
        <Link href="/login" className="transition hover:text-text">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
