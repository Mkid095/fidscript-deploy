'use client';

import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Key01Icon, Mail01Icon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { MagicCodeInput } from '@/components/auth/magic-code-input';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export default function LoginPage() {
  const { login, sendMagicCode, verifyMagicCode, lookupAuthMethod, loading, error } = useAuth();

  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [detecting, setDetecting] = useState(false);

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

  const detectMethod = useCallback(async (emailAddress: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) return;
    setDetecting(true);
    try {
      const method = await lookupAuthMethod(emailAddress);
      // null means user not found yet — show magic code form (the preferred onboarding flow)
      setAuthMethod(method ?? 'MAGIC_CODE');
    } catch {
      // Network/API error — default to magic code so new users always see the right form
      setAuthMethod('MAGIC_CODE');
    } finally {
      setDetecting(false);
    }
  }, [lookupAuthMethod]);

  async function handleEmailBlur() {
    if (email.trim()) await detectMethod(email.trim());
  }

  function validatePassword(): boolean {
    if (!email.trim()) { setValidationError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setValidationError('Enter a valid email address'); return false; }
    if (authMethod === 'PASSWORD' && !password) { setValidationError('Password is required'); return false; }
    if (authMethod === null) { setValidationError('Please wait for detection…'); return false; }
    setValidationError('');
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePassword()) return;
    try {
      await login(email, password);
    } catch {
      // error handled by context
    }
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
    } catch {
      // sendMagicCode always succeeds (no enumeration), but network errors possible
    }
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
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
        {/* Logo + wordmark */}
        <div className="mb-8 text-center">
          <img
            src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
            alt="FIDScript"
            width={72}
            height={72}
            className="mx-auto mb-3 rounded-xl"
          />
          <p className="text-sm font-bold tracking-widest text-orange-500 uppercase">fidscript deploy</p>
          <p className="text-xs text-slate-500 mt-0.5">by NextMavens</p>
        </div>

        {/* Auth method indicator */}
        {authMethod && (
          <div className="mb-5 flex items-center justify-center gap-2">
            <HugeiconsIcon
              icon={authMethod === 'PASSWORD' ? LockPasswordIcon : Mail01Icon}
              size={16}
              className="text-slate-400"
            />
            <span className={`text-xs ${
              authMethod === 'PASSWORD' ? 'text-slate-300' : 'text-orange-400'
            }`}>
              {authMethod === 'PASSWORD' ? 'Password login' : 'Magic code login'}
            </span>
          </div>
        )}

        {/* ── Unified form: shows password or magic-code send based on detected method ── */}
        {authMethod === 'PASSWORD' && (
          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <div>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setAuthMethod(null); setValidationError(''); }}
                  onBlur={handleEmailBlur}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
              </div>

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setValidationError(''); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                />
              </div>

              {(validationError || error) && (
                <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || detecting || (!!email && authMethod === null)}
                variant="primary"
                className="w-full mt-1"
              >
                {loading ? 'Signing in…' : detecting ? 'Detecting…' : 'Sign in'}
              </Button>

              <p className="text-center text-xs text-slate-500">
                No account?{' '}
                <a href="/register" className="text-blue-500 hover:text-blue-400">
                  Register
                </a>
              </p>
            </div>
          </form>
        )}

        {/* ── Magic code login (also shown while auth method is being detected) ── */}
        {(authMethod === null || authMethod === 'MAGIC_CODE') && (
          <div className="flex flex-col gap-4">
            {step === 'email' ? (
              <>
                <div>
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setAuthMethod(null); setValidationError(''); }}
                    onBlur={handleEmailBlur}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                {(validationError || error) && (
                  <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
                )}
                <Button
                  type="button"
                  onClick={handleSendCode}
                  variant="primary"
                  className="w-full"
                >
                  {detecting ? 'Detecting…' : 'Send magic code'}
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
                  <p className="text-sm text-green-400 text-center">Verifying…</p>
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
                {countdown === 0 && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="text-xs text-blue-500 hover:text-blue-400 text-center"
                  >
                    Resend code
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
