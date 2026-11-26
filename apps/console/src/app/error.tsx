'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Brand } from '@/components/brand/brand';

/**
 * When a screen falls over.
 *
 * It says what happened, and it offers the way back — a person who cannot
 * get out of a broken page cannot report it either.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The platform's own logs have the detail; the person has the page.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-canvas px-4">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Brand />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-danger">
          Something went wrong
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-text">
          This screen could not be shown
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          The rest of the platform is still there. Try this screen again, and if
          it keeps failing, the platform’s logs have the reason.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="primary" size="sm" onClick={reset}>
            Try again
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.assign('/overview')}
          >
            Go to the overview
          </Button>
        </div>
      </div>
    </div>
  );
}
