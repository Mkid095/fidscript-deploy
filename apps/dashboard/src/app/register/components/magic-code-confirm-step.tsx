'use client';

import { useState, useEffect } from 'react';
import { MagicCodeInput } from '@/components/auth/magic-code-input';
import { LoginErrorBanner } from '../../login/components/login-error-banner';

interface MagicCodeConfirmStepProps {
  maskedEmail: string;
  onResend: () => Promise<void>;
  onCodeComplete: (code: string) => void;
}

export function MagicCodeConfirmStep({
  maskedEmail,
  onResend,
  onCodeComplete,
}: MagicCodeConfirmStepProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function handleCodeComplete(rawCode: string) {
    setCode(rawCode);
    setCodeError('');
    try {
      await onCodeComplete(rawCode);
    } catch (err) {
      setCode('');
      setCodeError(err instanceof Error ? err.message : 'Invalid or expired code');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center space-y-1">
        <p className="text-sm text-[var(--text-muted)]">Check your inbox</p>
        <p className="text-sm font-medium text-[var(--text)]">{maskedEmail}</p>
      </div>
      <MagicCodeInput onComplete={handleCodeComplete} disabled={!!code} error={!!codeError} />
      {codeError && <LoginErrorBanner message={codeError} />}
      {code && !codeError && (
        <p className="text-sm text-[var(--success)] text-center">Verified — signing in…</p>
      )}
      <div className="flex justify-center">
        <button
          type="button"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Use a different email
        </button>
      </div>
      {countdown > 0 ? (
        <p className="text-center text-xs text-[var(--text-muted)]">Resend in {countdown}s</p>
      ) : (
        <button
          type="button"
          onClick={async () => { await onResend(); setCountdown(30); }}
          className="text-xs text-[var(--accent)] hover:underline text-center transition-colors"
        >
          Resend code
        </button>
      )}
    </div>
  );
}
