import { Suspense } from 'react';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
