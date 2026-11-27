'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui';

/** Sign out: end the session on the server, clear the cookie, go to /login. */
export function SignOut() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
