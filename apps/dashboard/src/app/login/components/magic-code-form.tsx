'use client';

import { Button, Input } from '@fidscript/ui';
import { MagicCodeInput } from '@/components/auth/magic-code-input';
import { LoginErrorBanner } from './login-error-banner';

interface MagicCodeFormProps {
  email: string;
  maskedEmail: string;
  step: 'email' | 'code';
  code: string;
  magicError: string;
  countdown: number;
  detecting: boolean;
  errorMessage: string | null;
  onEmailChange: (value: string) => void;
  onSendCode: () => void;
  onCodeComplete: (code: string) => void;
  onUseDifferentEmail: () => void;
}

export function MagicCodeForm({
  email,
  maskedEmail,
  step,
  code,
  magicError,
  countdown,
  detecting,
  errorMessage,
  onEmailChange,
  onSendCode,
  onCodeComplete,
  onUseDifferentEmail,
}: MagicCodeFormProps) {
  if (step === 'email') {
    return (
      <div className="flex flex-col gap-5">
        {errorMessage && <LoginErrorBanner message={errorMessage} />}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="admin@example.com"
          autoComplete="email"
        />
        <Button
          type="button"
          onClick={onSendCode}
          variant="primary"
          className="w-full"
          size="md"
          disabled={detecting}
        >
          {detecting ? 'Detecting…' : 'Send magic code'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center space-y-1">
        <p className="text-sm text-[var(--text-muted)]">Check your inbox</p>
        <p className="text-sm font-medium text-[var(--text)]">{maskedEmail}</p>
      </div>
      <MagicCodeInput
        onComplete={onCodeComplete}
        disabled={!!code}
        error={!!magicError}
      />
      {magicError && <LoginErrorBanner message={magicError} />}
      {code && !magicError && (
        <p className="text-sm text-[var(--success)] text-center">Verifying…</p>
      )}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Use a different email
        </button>
      </div>
      {countdown > 0 && (
        <p className="text-center text-xs text-[var(--text-muted)]">
          Resend in {countdown}s
        </p>
      )}
      {countdown === 0 && (
        <button
          type="button"
          onClick={onSendCode}
          className="text-xs text-[var(--accent)] hover:underline text-center transition-colors"
        >
          Resend code
        </button>
      )}
    </div>
  );
}
