'use client';

import { useRouter } from 'next/navigation';

/** Sign out: end the session on the server, clear the cookie, go to /login. */
export function SignOut() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
      className="rounded border border-rail bg-surface px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      Sign out
    </button>
  );
}
