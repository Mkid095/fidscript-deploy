import { Suspense } from 'react';

import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
