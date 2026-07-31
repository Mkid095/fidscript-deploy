'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { Key01Icon, Mail01Icon, LockPasswordIcon } from '@hugeicons/core-free-icons';
import { Button, Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from './login-form';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export default function LoginPage() {
  const { lookupAuthMethod, loading, error } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('MAGIC_CODE');
  const [email, setEmail] = useState('');
  const [detecting, setDetecting] = useState(false);

  const detectMethod = useCallback(async (emailAddress: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) return;
    setDetecting(true);
    try {
      const method = await lookupAuthMethod(emailAddress);
      setAuthMethod(method ?? 'MAGIC_CODE');
    } catch {
      setAuthMethod('MAGIC_CODE');
    } finally {
      setDetecting(false);
    }
  }, [lookupAuthMethod]);

  async function handleEmailBlur() {
    if (email.trim()) await detectMethod(email.trim());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="mb-8 text-center">
          <Image
            src="https://res.cloudinary.com/dfp7zy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
            alt="FIDScript" width={72} height={72}
            className="mx-auto mb-3 rounded-xl"
          />
          <p className="text-sm font-bold tracking-widest text-[var(--warning)] uppercase">fidscript deploy</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">by NextMavens</p>
        </div>

        <LoginForm
          authMethod={authMethod}
          onMethodChange={(m) => { setAuthMethod(m); setEmail(''); }}
          error={error}
          loading={loading}
          detecting={detecting}
        />

        <div className="flex flex-col gap-3 mt-4">
          <div className="flex border-b border-[var(--rail)]">
            <button type="button"
              onClick={() => { setAuthMethod('PASSWORD'); }}
              className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 ${
                authMethod === 'PASSWORD' ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
              }`}>
              <HugeiconsIcon icon={LockPasswordIcon} size={14} className="inline mr-1" />Password
            </button>
            <button type="button"
              onClick={() => { setAuthMethod('MAGIC_CODE'); }}
              className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 ${
                authMethod === 'MAGIC_CODE' ? 'border-[var(--warning)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
              }`}>
              <HugeiconsIcon icon={Mail01Icon} size={14} className="inline mr-1" />Magic code
            </button>
          </div>
          <div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onBlur={handleEmailBlur} placeholder="you@example.com" autoComplete="email"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          No account?{' '}
          <a href="/register" className="text-[var(--accent)] hover:text-[var(--accent)]">Register</a>
        </p>
      </Card>
    </div>
  );
}
