'use client';

import { useState } from 'react';
import { Button, Input } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { MagicCodeInput } from '@/components/auth/magic-code-input';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface LoginFormProps {
  authMethod: AuthMethod;
  onMethodChange: (m: AuthMethod) => void;
  error: string | null;
  loading: boolean;
  detecting: boolean;
  /** Pre-filled email from the parent page (for auto-fill after method detection) */
  email?: string;
  onEmailChange?: (email: string) => void;
}

export function LoginForm({ authMethod, onMethodChange, error, loading, detecting, email = '', onEmailChange }: LoginFormProps) {
  const { login, sendMagicCode, verifyMagicCode } = useAuth();
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [magicError, setMagicError] = useState('');
  const [countdown, setCountdown] = useState(0);

  function validatePassword(): boolean {
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (!password) { setValidationError('Password is required'); return false; }
    setValidationError('');
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword()) return;
    try { await login(email, password); } catch { /* error handled by context */ }
  }

  async function handleSendCode() {
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    setValidationError('');
    try {
      await sendMagicCode(email);
      const [local, domain] = email.split('@');
      setMaskedEmail(`${local.slice(0, 2)}***@${domain}`);
      setStep('code');
      setCountdown(30);
    } catch { /* sendMagicCode always succeeds */ }
  }

  async function handleCodeComplete(rawCode: string) {
    if (code) return;
    setCode(rawCode);
    try {
      await verifyMagicCode(email, rawCode);
    } catch (err) {
      setCode('');
      setMagicError(err instanceof Error ? err.message : 'Invalid or expired code');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Email" type="email" value={email}
        onChange={e => { onEmailChange?.(e.target.value); setValidationError(''); }}
        placeholder="you@example.com" autoComplete="email"
        className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
      />

      {authMethod === 'PASSWORD' ? (
        <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Password" type="password" value={password}
            onChange={e => { setPassword(e.target.value); setValidationError(''); }}
            placeholder="Enter your password" autoComplete="current-password"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
          {(validationError || error) && (
            <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
          )}
          <Button type="submit" disabled={loading || detecting} variant="primary" className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {step === 'email' ? (
            <>
              {(validationError || error) && (
                <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
              )}
              <Button type="button" onClick={handleSendCode} variant="primary" className="w-full" disabled={detecting}>
                {detecting ? 'Detecting…' : 'Send magic code'}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm text-[var(--text-muted)]">Check your inbox</p>
                <p className="text-sm text-[var(--text-muted)] font-medium">{maskedEmail}</p>
              </div>
              <MagicCodeInput onComplete={handleCodeComplete} disabled={!!code} error={!!magicError} />
              {magicError && <p className="text-sm text-[var(--danger)] text-center" role="alert">{magicError}</p>}
              {code && !magicError && <p className="text-sm text-green-400 text-center">Verifying…</p>}
              <div className="flex justify-center">
                <button type="button" onClick={() => { setStep('email'); setCode(''); setMagicError(''); }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]">
                  Use different email
                </button>
              </div>
              {countdown > 0 && <p className="text-center text-xs text-[var(--text-muted)]">Resend in {countdown}s</p>}
              {countdown === 0 && (
                <button type="button" onClick={handleSendCode}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent)] text-center">
                  Resend code
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
