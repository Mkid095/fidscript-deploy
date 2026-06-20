'use client';

import { useState, useEffect } from 'react';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { MagicCodeInput } from '@/components/auth/magic-code-input';

type Tab = 'email' | 'magic';

export default function LoginPage() {
  const { login, sendMagicCode, verifyMagicCode, loading, error } = useAuth();

  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  // Magic-code state
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [magicError, setMagicError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Email validation
  function validateEmail(): boolean {
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (!password) { setValidationError('Password is required'); return false; }
    setValidationError('');
    return true;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail()) return;
    try {
      await login(email, password);
    } catch {
      // error handled by context
    }
  }

  async function handleSendCode() {
    if (!email.trim()) { setValidationError('Email is required'); return; }
    setValidationError('');
    try {
      await sendMagicCode(email);
      const [local, domain] = email.split('@');
      const masked = `${local.slice(0, 2)}***@${domain}`;
      setMaskedEmail(masked);
      setStep('code');
      setCountdown(30);
    } catch {
      // sendMagicCode always succeeds (no enumeration), but network errors possible
    }
  }

  async function handleCodeComplete(rawCode: string) {
    if (code) return; // already submitted
    setCode(rawCode);
    try {
      await verifyMagicCode(email, rawCode);
    } catch (err) {
      setCode('');
      setMagicError(err instanceof Error ? err.message : 'Invalid or expired code');
    }
  }

  function switchToEmail() {
    setTab('email');
    setStep('email');
    setCode('');
    setMagicError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-200 mb-1">Gateway Access</h1>
          <p className="text-sm text-slate-500">FIDScript Deploy</p>
        </div>

        {/* Segmented control */}
        <div className="flex rounded-lg bg-slate-900 p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={switchToEmail}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              tab === 'email'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => { setTab('magic'); setValidationError(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              tab === 'magic'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Magic code
          </button>
        </div>

        {/* Email + password tab */}
        {tab === 'email' && (
          <form onSubmit={handleEmailSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
              />
              {(validationError || error) && (
                <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full mt-1"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        )}

        {/* Magic-code tab */}
        {tab === 'magic' && (
          <div className="flex flex-col gap-4">
            {step === 'email' ? (
              <>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setMagicError(''); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
                {validationError && (
                  <p className="text-sm text-red-400" role="alert">{validationError}</p>
                )}
                <Button
                  type="button"
                  onClick={handleSendCode}
                  variant="secondary"
                  className="w-full"
                >
                  Send code
                </Button>
                <p className="text-center text-xs text-slate-500">
                  No account?{' '}
                  <a href="/register" className="text-blue-500 hover:text-blue-400">
                    Register
                  </a>
                </p>
              </>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <p className="text-sm text-slate-400">Check your inbox</p>
                  <p className="text-sm text-slate-300 font-medium">{maskedEmail}</p>
                </div>
                <MagicCodeInput
                  onComplete={handleCodeComplete}
                  disabled={!!code}
                  error={!!magicError}
                />
                {magicError && (
                  <p className="text-sm text-red-400 text-center" role="alert">{magicError}</p>
                )}
                {code && !magicError && (
                  <p className="text-sm text-green-400 text-center">Verifying...</p>
                )}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setCode(''); setMagicError(''); }}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Use different email
                  </button>
                </div>
                {countdown > 0 && (
                  <p className="text-center text-xs text-slate-500">
                    Resend in {countdown}s
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
