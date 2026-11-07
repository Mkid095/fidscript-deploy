import { Suspense } from 'react';

import { MfaChallengeForm } from '@/components/auth/mfa-challenge-form';

export const metadata = { title: 'Two-factor authentication' };

export default function MfaChallengePage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Loading…</p>}>
      <MfaChallengeForm />
    </Suspense>
  );
}
