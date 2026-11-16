'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/feedback';

import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from '@/app/(platform)/settings/actions';
import { useToast } from '@/components/ui/toast';

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
  const [ended, setEnded] = useState<number | null>(null);
  const toast = useToast();

  const end = (sessionId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeSessionAction(sessionId);
      if (result.error) {
        setError(result.error);
        toast.error('The session is still open', result.error);
        return;
      }
      toast.success('The session was ended.');
    });
  };

  const endOthers = () => {
    setError(null);
    startTransition(async () => {
      const result = await revokeOtherSessionsAction();
      if (result.error) {
        setError(result.error);
        toast.error('The other sessions are still open', result.error);
        return;
      }
      setEnded(result.revoked ?? 0);
      toast.success(
        result.revoked === 1
          ? '1 other session was ended.'
          : (result.revoked ?? 0) + ' other sessions were ended.',
      );
    });
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No other sessions"
          body="This account is signed in here, and nowhere else."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-dim">
          {ended !== null
            ? `${ended} other session${ended === 1 ? '' : 's'} ended.`
            : 'The list below is the newest of this account’s open sessions.'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={endOthers}
          loading={pending}
        >
          End the others
        </Button>
      </div>
      <Card>
        <ul className="divide-y divide-rail">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text">
                  {describe(session.userAgent)}
                </p>
                <p className="truncate text-xs text-text-dim">
                  {session.ipAddress ?? 'Unknown address'} · started{' '}
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => end(session.id)}
                loading={pending}
              >
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
