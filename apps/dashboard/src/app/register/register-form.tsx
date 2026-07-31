'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Button, Input } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PasswordStrength } from '@/components/auth/password-strength';
import { MagicCodeInput } from '@/components/auth/magic-code-input';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface RegisterFormProps {
  authMethod: AuthMethod;
  onMethodChange: (m: AuthMethod) => void;
  error: string | null;
  loading: boolean;
}

export function RegisterForm({ authMethod, onMethodChange, error, loading }: RegisterFormProps) {
  const { register, verifyMagicCode } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  function validatePassword(): boolean {
    if (!name.trim()) { setValidationError('Name is required'); return false; }
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (password.length < 12) { setValidationError('Password must be at least 12 characters'); return false; }
    if (!/[A-Z]/.test(password)) { setValidationError('Password must contain an uppercase letter'); return false; }
    if (!/[a-z]/.test(password)) { setValidationError('Password must contain a lowercase letter'); return false; }
    if (!/[0-9]/.test(password)) { setValidationError('Password must contain a number'); return false; }
    if (password !== confirm) { setValidationError('Passwords do not match'); return false; }
    setValidationError('');
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword()) return;
    try { await register(email, name, password, 'PASSWORD'); } catch { /* error handled by context */ }
  }

  async function handleMagicCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setValidationError('Name is required'); return; }
    if (!email.trim()) { setValidationError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return; }
    setValidationError('');
    try {
      await register(email, name, '', 'MAGIC_CODE');
      const [local, domain] = email.split('@');
      setMaskedEmail(`${local.slice(0, 2)}***@${domain}`);
      setStep('code');
      setCountdown(30);
    } catch { /* error handled by context */ }
  }

  async function handleCodeComplete(rawCode: string) {
    setCode(rawCode);
    setCodeError('');
    try { await verifyMagicCode(email, rawCode); }
    catch (err) { setCode(''); setCodeError(err instanceof Error ? err.message : 'Invalid or expired code'); }
  }

  if (step === 'code') {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-[var(--text-muted)]">Check your inbox</p>
          <p className="text-sm text-[var(--text-muted)] font-medium">{maskedEmail}</p>
        </div>
        <MagicCodeInput onComplete={handleCodeComplete} disabled={!!code} error={!!codeError} />
        {codeError && <p className="text-sm text-[var(--danger)] text-center" role="alert">{codeError}</p>}
        {code && !codeError && <p className="text-sm text-green-400 text-center">Verified — signing in…</p>}
      </div>
    );
  }

  return (
    <>
      {authMethod === 'PASSWORD' ? (
        <form onSubmit={handlePasswordSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <Input label="Name" type="text" value={name} onChange={e => { setName(e.target.value); setValidationError(''); }}
              placeholder="Your full name" autoComplete="name"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
            <Input label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setValidationError(''); }}
              placeholder="you@example.com" autoComplete="email"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
            <div className="space-y-1">
              <Input label="Password" type="password" value={password}
                onChange={e => { setPassword(e.target.value); setValidationError(''); }}
                placeholder="At least 12 characters" autoComplete="new-password"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
              <PasswordStrength password={password} />
            </div>
            <Input label="Confirm password" type="password" value={confirm}
              onChange={e => { setConfirm(e.target.value); setValidationError(''); }}
              placeholder="Re-enter password" autoComplete="new-password"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
            {(validationError || error) && (
              <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
            )}
            <Button type="submit" disabled={loading} variant="primary" className="w-full mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMagicCodeSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-orange-900/20 border border-orange-800/40 p-3">
              <p className="text-xs text-orange-300">A magic code will be sent to your email each time you sign in.</p>
            </div>
            <Input label="Name" type="text" value={name} onChange={e => { setName(e.target.value); setValidationError(''); }}
              placeholder="Your full name" autoComplete="name"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]" />
            <Input label="Email" type="email" value={email} onChange={e => { setEmail(e.target.value); setValidationError(''); }}
              placeholder="you@example.com" autoComplete="email"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--var(--text-dim)]" />
            {(validationError || error) && (
              <p className="text-sm text-[var(--danger)]" role="alert">{validationError || error}</p>
            )}
            <Button type="submit" disabled={loading} variant="primary" className="w-full mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
