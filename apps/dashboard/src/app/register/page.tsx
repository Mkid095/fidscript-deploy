'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { PasswordStrength } from '@/components/auth/password-strength';
import { MagicCodeInput } from '@/components/auth/magic-code-input';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export default function RegisterPage() {
  const { register, sendMagicCode, loading, error } = useAuth();

  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
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
    try {
      await register(email, name, password, 'PASSWORD');
    } catch {
      // error handled by context
    }
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
    } catch {
      // error handled by context
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
          <h1 className="text-xl font-bold text-slate-200 mb-0.5">Create account</h1>
          <p className="text-xs text-slate-500">fidscript deploy &middot; by NextMavens</p>
        </div>

        {step === 'form' ? (
          <>
            {/* Auth method selector */}
            <div className="flex rounded-lg bg-slate-900 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMethod('PASSWORD')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  authMethod === 'PASSWORD' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HugeiconsIcon icon={LockPasswordIcon} size={16} />
                Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('MAGIC_CODE')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                  authMethod === 'MAGIC_CODE' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HugeiconsIcon icon={Mail01Icon} size={16} />
                Magic code
              </button>
            </div>

            {authMethod === 'PASSWORD' ? (
              <form onSubmit={handlePasswordSubmit} noValidate>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Name"
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setValidationError(''); }}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setValidationError(''); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                  <div className="space-y-1">
                    <Input
                      label="Password"
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setValidationError(''); }}
                      placeholder="At least 12 characters"
                      autoComplete="new-password"
                      className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                    />
                    <PasswordStrength password={password} />
                  </div>
                  <Input
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setValidationError(''); }}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                  {(validationError || error) && (
                    <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
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
                    <p className="text-xs text-orange-300">
                      A magic code will be sent to your email each time you sign in.
                    </p>
                  </div>
                  <Input
                    label="Name"
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setValidationError(''); }}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setValidationError(''); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="bg-[#080a0d] border border-[#1e2130] text-slate-200 placeholder:text-slate-600"
                  />
                  {(validationError || error) && (
                    <p className="text-sm text-red-400" role="alert">{validationError || error}</p>
                  )}
                  <Button type="submit" disabled={loading} variant="primary" className="w-full mt-1">
                    {loading ? 'Creating account…' : 'Create account'}
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Magic code verification step */
          <div className="flex flex-col gap-4">
            <div className="text-center space-y-1">
              <p className="text-sm text-slate-400">Check your inbox</p>
              <p className="text-sm text-slate-300 font-medium">{maskedEmail}</p>
            </div>
            <MagicCodeInput
              onComplete={() => {}}
              disabled={!!code}
              error={!!codeError}
            />
            {codeError && (
              <p className="text-sm text-red-400 text-center" role="alert">{codeError}</p>
            )}
            {code && !codeError && (
              <p className="text-sm text-green-400 text-center">Verified — signing in…</p>
            )}
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-blue-500 hover:text-blue-400">
            Sign in
          </a>
        </p>
      </Card>
    </div>
  );
}
