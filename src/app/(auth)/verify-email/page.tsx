import { Suspense } from 'react';

import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';

export const metadata = { title: 'Confirm your email' };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Checking your link…</p>}>
      <VerifyEmailPanel />
    </Suspense>
  );
}
