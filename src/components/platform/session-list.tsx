'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/feedback';

import { revokeSessionAction } from '@/app/(platform)/settings/actions';

interface OpenSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Where the account is signed in.
 *
 * A session can be ended here — the one on a machine you no longer use, or
 * the one you do not recognise.
 */
export function SessionList({ sessions }: { sessions: OpenSession[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const end = (sessionId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeSessionAction(sessionId);
      if (result.error) setError(result.error);
    });
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <EmptyState title="No other sessions" body="This account is signed in here, and nowhere else." />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card>
        <ul className="divide-y divide-rail">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-text">
                  {describe(session.userAgent)}
                </p>
                <p className="truncate text-xs text-text-dim">
                  {session.ipAddress ?? 'Unknown address'} · started{' '}
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => end(session.id)} loading={pending}>
                End it
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}

/** What the session says about the browser it is in. */
function describe(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  if (userAgent.includes('Edg')) return 'Microsoft Edge';
  if (userAgent.includes('Chrome')) return 'Google Chrome';
  if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('curl')) return 'The command line';
  return userAgent.slice(0, 48);
}
