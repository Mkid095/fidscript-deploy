'use client';

import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // The whole address, not just the path: `/projects?tab=env` used to
      // arrive as `/projects`.
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    } else if (!loading && user?.mustChangePassword) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/force-change-password?next=${next}`;
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || user.mustChangePassword) return null;

  return <>{children}</>;
}
