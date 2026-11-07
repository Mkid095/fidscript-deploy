import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * The page that is not there.
 *
 * It says what happened and where to go next — a dead end with a door in
 * it.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-dim">
          404
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-text">
          There is nothing at this address
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          The page may have moved, or the link that brought you here was never right.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link href="/">
            <Button variant="primary" size="sm">
              The front door
            </Button>
          </Link>
          <Link href="/overview">
            <Button variant="ghost" size="sm">
              Your projects
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
