'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthPageShell } from '../login/components/auth-page-shell';
import { LoginErrorBanner } from '../login/components/login-error-banner';
import { Button, Input } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

type Step = 'form' | 'sent';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setBackendError('');

    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email address'); return; }

    setLoading(true);
    try {
      await forgotPassword(email);
      setStep('sent');
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      Remember your password?{' '}
      <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
        Sign in
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Reset your password"
      subtitle="We'll send you a link to reset your password"
      footer={footer}
    >
      {step === 'sent' ? (
        <div className="flex flex-col items-center gap-4 text-center py-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--success)]/10">
            <svg className="size-7 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Check your inbox</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              If <span className="font-medium text-[var(--text)]">{email}</span> is registered, we sent a password reset link.
            </p>
          </div>
          <p className="text-xs text-[var(--text-dim)]">
            Didn't get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={() => setStep('form')}
              className="text-[var(--accent)] hover:underline"
            >
              try again
            </button>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-muted)] mb-1">
              Enter the email address for your account and we'll send you a password reset link.
            </p>
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
              error={emailError || undefined}
            />
            {(backendError) && <LoginErrorBanner message={backendError} />}
            <Button type="submit" disabled={loading} variant="primary" className="w-full mt-1">
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </div>
        </form>
      )}
    </AuthPageShell>
  );
}
