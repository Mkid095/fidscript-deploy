'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';
import { Spinner } from '@/components/ui/button';

import { acceptInvitationAction } from '@/app/(auth)/invitations/accept/actions';

/**
 * Accepting an invitation.
 *
 * The link carries the token; the panel spends it once, and then says what
 * happened — the project it joined, or why it could not.
 */
export function AcceptInvitationPanel({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    acceptInvitationAction(token).then((result) => {
      if (cancelled) return;
      if (result.ok && result.projectId) {
        setProjectId(result.projectId);
        setState('done');
        return;
      }
      setError(result.error ?? 'The invitation could not be accepted.');
      setState('failed');
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'working') {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-text-muted">
        <Spinner />
        Joining the project…
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-text">You are in the project.</p>
        <Link href={`/projects/${projectId}/overview`}>
          <Button variant="primary">Open the project</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <ErrorState title="That invitation did not work" message={error ?? ''} />
      <Link href="/login">
        <Button variant="outline">Go to the sign in</Button>
      </Link>
    </div>
  );
}
