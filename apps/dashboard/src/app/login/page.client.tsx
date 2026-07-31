'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Card, Button, Input } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface LoginClientProps {
  platformAuthMethod: AuthMethod | null;
}

export function LoginClient({ platformAuthMethod }: LoginClientProps) {
  const { login, sendMagicCode, verifyMagicCode, lookupAuthMethod, loading, error } = useAuth();
  const [effectiveMethod, setEffectiveMethod] = useState<AuthMethod>(
    platformAuthMethod ?? 'PASSWORD'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [magicStep, setMagicStep] = useState<'email' | 'code'>('email');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [magicError, setMagicError] = useState('');
  const [countdown, setCountdown] = useState(0);

  async function handleEmailChange(addr: string) {
    setEmail(addr);
    setValidationError('');
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return;
    setDetecting(true);
    try {
      const method = await lookupAuthMethod(addr);
      setEffectiveMethod(method ?? platformAuthMethod ?? 'PASSWORD');
    } catch {
      setEffectiveMethod(platformAuthMethod ?? 'PASSWORD');
    } finally {
      setDetecting(false);
    }
  }

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
    try { await login(email, password); } catch { /* handled by context */ }
  }

  async function handleSendCode() {
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    setValidationError('');
    try {
      await sendMagicCode(email);
      const [local, domain] = email.split('@');
      setMaskedEmail(`${local.slice(0, 2)}***@${domain}`);
      setMagicStep('code');
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

  const showTabs = platformAuthMethod === null;
  const showPassword = effectiveMethod === 'PASSWORD';
  const showMagic = effectiveMethod === 'MAGIC_CODE';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-sm border border-[var(--rail)] shadow-2xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <img src="/logo.svg" alt="FIDScript" width={120} height={28} className="h-7 w-auto" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Sign in to your platform</p>
        </div>

        {/* Auth method tabs — only when platform has no configured method */}
        {showTabs && (
          <div className="flex border-b border-[var(--rail)] mb-6">
            <button type="button"
              onClick={() => { setEffectiveMethod('PASSWORD'); setMagicStep('email'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                showPassword ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              <HugeiconsIcon icon={LockPasswordIcon} size={14} />Password
            </button>
            <button type="button"
              onClick={() => { setEffectiveMethod('MAGIC_CODE'); setMagicStep('email'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                showMagic ? 'border-[var(--warning)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}>
              <HugeiconsIcon icon={Mail01Icon} size={14} />Magic code
            </button>
          </div>
        )}

        {/* Platform badge when method is configured */}
        {!showTabs && (
          <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)]">
            <HugeiconsIcon icon={showPassword ? LockPasswordIcon : Mail01Icon} size={14} className="text-[var(--accent)]" />
            <span className="text-xs text-[var(--text-muted)]">
              Platform auth: <span className="text-[var(--text)] font-medium">{showPassword ? 'Password' : 'Magic code'}</span>
            </span>
          </div>
        )}

        {/* Password form */}
        {showPassword && (
          <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => handleEmailChange(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setValidationError(''); }}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
            />
            {(validationError || error) && (
              <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
            )}
            <Button type="submit" disabled={loading || detecting} variant="primary" className="w-full mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}

        {/* Magic code form */}
        {showMagic && (
          <div className="flex flex-col gap-4">
            {magicStep === 'email' ? (
              <>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]"
                />
                {(validationError || error) && (
                  <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
                )}
                <Button type="button" onClick={handleSendCode} variant="primary" className="w-full" disabled={detecting}>
                  {detecting ? 'Detecting…' : 'Send magic code'}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-center space-y-1 py-2">
                  <p className="text-sm text-[var(--text-muted)]">Check your inbox</p>
                  <p className="text-sm font-medium text-[var(--text)]">{maskedEmail}</p>
                </div>
                <MagicCodeInput onComplete={handleCodeComplete} disabled={!!code} hasError={!!magicError} />
                {magicError && (
                  <p className="text-sm text-[var(--danger)] text-center" role="alert">{magicError}</p>
                )}
                {code && !magicError && (
                  <p className="text-sm text-green-400 text-center">Verifying…</p>
                )}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { setMagicStep('email'); setCode(''); setMagicError(''); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    Use a different email
                  </button>
                </div>
                {countdown > 0 && (
                  <p className="text-center text-xs text-[var(--text-muted)]">Resend in {countdown}s</p>
                )}
                {countdown === 0 && (
                  <button type="button" onClick={handleSendCode}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent)] text-center transition-colors">
                    Resend code
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          No account?{' '}
          <Link href="/register" className="text-[var(--accent)] hover:text-[var(--accent)]">Register</Link>
        </p>
      </Card>
    </div>
  );
}

function MagicCodeInput({ onComplete, disabled, hasError }: {
  onComplete: (code: string) => void;
  disabled: boolean;
  hasError: boolean;
}) {
  const [values, setValues] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...values];
    next[idx] = val;
    setValues(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every(v => v !== '')) onComplete(next.join(''));
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...values];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setValues(next);
    if (next.every(v => v !== '')) onComplete(next.join(''));
  }

  return (
    <div className="flex gap-2 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          className={`
            w-12 h-14 text-center text-xl font-mono rounded-lg
            bg-[var(--surface-2)] border text-[var(--text)]
            placeholder:text-[var(--text-dim)]
            focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${hasError ? 'border-[var(--danger)] animate-shake' : 'border-[var(--rail-light)] focus:border-slate-500'}
          `}
          style={hasError ? { animation: 'shake 0.3s ease-in-out' } : undefined}
        />
      ))}
    </div>
  );
}
