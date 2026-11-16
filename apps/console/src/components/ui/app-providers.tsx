'use client';

import { Suspense } from 'react';

import { NavigationProgress } from '@/components/ui/navigation-progress';
import { ToastProvider } from '@/components/ui/toast';

/**
 * The interface's shared behaviour, mounted once.
 *
 * The toast provider (what actions say), and the navigation bar (that a
 * click is being answered). The progress bar reads the route, so it sits
 * behind a boundary of its own.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {children}
    </ToastProvider>
  );
}
