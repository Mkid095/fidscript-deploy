import { Suspense } from 'react';

import { MagicLinkPanel } from '@/components/auth/magic-link-panel';

export const metadata = { title: 'Signing you in' };

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-muted">Signing you in…</p>}>
      <MagicLinkPanel />
    </Suspense>
  );
}
