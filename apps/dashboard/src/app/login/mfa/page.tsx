'use client';

/**
 * The second factor.
 *
 * A sign-in that stops here has already proved the password — the API issued
 * a challenge instead of tokens. This is where the person proves the rest.
 *
 * There was no screen for this at all: the challenge token was discarded, the
 * client stored `undefined` as an access token, and the person was bounced
 * between the login screen and the app for as long as they tried.
 */
import { Suspense, useState } from 'react';
import Link from 'next/link';

import { AuthPageShell } from '../components/auth-page-shell';
import { LoginErrorBanner } from '../components/login-error-banner';
import { MagicCodeInput } from '@/components/auth/magic-code-input';
import { Button, Input } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

function MfaChallengePageInner() {
  const { mfaChallenge, loading, error } = useAuth();
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [localError, setLocalError] = useState('');

  async function submit(value: string) {
    setLocalError('');
    try {
      await mfaChallenge(value);
    } catch {
      // The context holds the message; the field is cleared so the next
      // attempt starts from scratch.
      setCode('');
      setRecoveryCode('');
    }
  }

  function handleComplete(value: string) {
    setCode(value);
    void submit(value);
  }

  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
        Use a different account
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Two-factor authentication"
      subtitle="Enter the code from your authenticator app to finish signing in."
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {useRecovery ? (
          <form
            onSubmit={(e) => { e.preventDefault(); void submit(recoveryCode.trim()); }}
            noValidate
            className="flex flex-col gap-4"
          >
            <Input
              label="Recovery code"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="abcd1234-efgh56"
              autoComplete="off"
              spellCheck={false}
              hint="One of the recovery codes you saved when you turned two-factor on."
            />
            <Button type="submit" variant="primary" disabled={loading || !recoveryCode.trim()}>
              {loading ? 'Checking…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <MagicCodeInput
              label="Authenticator code"
              onComplete={handleComplete}
              disabled={loading}
              error={Boolean(error || localError)}
            />
            {(error || localError) && (
              <LoginErrorBanner message={error ?? localError} />
            )}
            <Button
              variant="primary"
              disabled={loading || code.length < 6}
              loading={loading}
              onClick={() => void submit(code)}
            >
              {loading ? 'Checking…' : 'Verify'}
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setUseRecovery(v => !v); setLocalError(''); }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors self-center"
        >
          {useRecovery ? 'Use your authenticator app instead' : 'Use a recovery code instead'}
        </button>
      </div>
    </AuthPageShell>
  );
}

/**
 * The page reads the token from the address, so it is rendered inside a
 * boundary — Next cannot prerender a page whose query string it does not
 * know at build time.
 */
export default function MfaChallengePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)] p-6">Checking…</p>}>
      <MfaChallengePageInner />
    </Suspense>
  );
}
