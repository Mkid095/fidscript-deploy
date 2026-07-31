'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from './login-form';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export default function LoginPage() {
  const { lookupAuthMethod, loading, error } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');
  const [platformAuthMethod, setPlatformAuthMethod] = useState<AuthMethod | null>(null);
  const [email, setEmail] = useState('');
  const [detecting, setDetecting] = useState(false);

  // Detect platform's configured auth method on mount
  useEffect(() => {
    async function detect() {
      try {
        const res = await fetch('/api/v1/installation/status');
        if (res.ok) {
          const data = await res.json() as { authMethod?: AuthMethod };
          if (data.authMethod) setPlatformAuthMethod(data.authMethod);
        }
      } catch { /* detection failed — use default */ }
    }
    detect();
  }, []);

  // Auto-detect per-email auth method when email changes
  async function handleEmailChange(addr: string) {
    setEmail(addr);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return;
    setDetecting(true);
    try {
      const method = await lookupAuthMethod(addr);
      setAuthMethod(method ?? platformAuthMethod ?? 'PASSWORD');
    } catch {
      setAuthMethod(platformAuthMethod ?? 'PASSWORD');
    } finally {
      setDetecting(false);
    }
  }

  const effectiveMethod = platformAuthMethod ?? authMethod;

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
          authMethod={effectiveMethod}
          onMethodChange={setAuthMethod}
          error={error}
          loading={loading}
          detecting={detecting}
          email={email}
          onEmailChange={handleEmailChange}
        />

        {/* Tab strip only shown when platform auth method hasn't been detected yet */}
        {platformAuthMethod === null && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex border-b border-[var(--rail)]">
              <button type="button"
                onClick={() => setAuthMethod('PASSWORD')}
                className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 ${
                  effectiveMethod === 'PASSWORD' ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'
                }`}>
                <HugeiconsIcon icon={LockPasswordIcon} size={14} className="inline mr-1" />Password
              </button>
              <button type="button"
                onClick={() => setAuthMethod('MAGIC_CODE')}
                className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 ${
                  effectiveMethod === 'MAGIC_CODE' ? 'border-[var(--warning)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'
                }`}>
                <HugeiconsIcon icon={Mail01Icon} size={14} className="inline mr-1" />Magic code
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          No account?{' '}
          <a href="/register" className="text-[var(--accent)] hover:text-[var(--accent)]">Register</a>
        </p>
      </Card>
    </div>
  );
}
