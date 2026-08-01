'use client';

import Link from 'next/link';
import { AuthPageShell } from '../login/components/auth-page-shell';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  const footer = (
    <p className="text-center text-sm text-[var(--text-muted)] mt-6">
      Already have an account?{' '}
      <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
        Sign in
      </Link>
    </p>
  );

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Join FIDScript to deploy and manage your infrastructure"
      footer={footer}
      maxWidth="480"
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
