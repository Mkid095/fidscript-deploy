import { Suspense } from 'react';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
