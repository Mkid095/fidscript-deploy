'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/components/toast-provider';

/**
 * The application's providers.
 *
 * **The toast provider belongs here.** It was mounted in five of the
 * application's sixty-eight pages, and `useToast` falls back to a **silent
 * no-op** when there is no provider above it — so fifty-one of the sixty-one
 * "it worked" messages never rendered. An operator clicked a button, the
 * request succeeded, and the screen did not move.
 *
 * One provider, above everything, and every screen's feedback is real.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
