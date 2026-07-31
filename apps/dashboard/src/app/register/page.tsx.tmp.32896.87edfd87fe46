'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Card } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { RegisterForm } from './register-form';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

export default function RegisterPage() {
  const { loading, error } = useAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('PASSWORD');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="mb-8 text-center">
          <Image
            src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
            alt="FIDScript" width={72} height={72}
            className="mx-auto mb-3 rounded-xl"
          />
          <h1 className="text-xl font-bold text-[var(--text)] mb-0.5">Create account</h1>
          <p className="text-xs text-[var(--text-muted)]">fidscript deploy &middot; by NextMavens</p>
        </div>

        <div className="flex rounded-lg bg-[var(--surface-2)] p-1 mb-6 border border-[var(--rail)]">
          <button type="button" onClick={() => setAuthMethod('PASSWORD')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              authMethod === 'PASSWORD' ? 'bg-[var(--rail)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}>
            <HugeiconsIcon icon={LockPasswordIcon} size={16} />Password
          </button>
          <button type="button" onClick={() => setAuthMethod('MAGIC_CODE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
              authMethod === 'MAGIC_CODE' ? 'bg-[var(--rail)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}>
            <HugeiconsIcon icon={Mail01Icon} size={16} />Magic code
          </button>
        </div>

        <RegisterForm authMethod={authMethod} onMethodChange={setAuthMethod} error={error} loading={loading} />

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--accent)] hover:text-[var(--accent)]">Sign in</a>
        </p>
      </Card>
    </div>
  );
}
