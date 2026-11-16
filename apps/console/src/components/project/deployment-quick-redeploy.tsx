'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { redeployAction } from '@/app/(project)/projects/[projectId]/deployments/actions';

/**
 * The quick path on the new-deployment screen.
 *
 * A project that has deployed before does not redo the four-step wizard for
 * the same source: one press builds the latest commit of the branch it was
 * last built on, and the history screen is one link away for the failed
 * attempts, the rollbacks and the logs.
 */
export function QuickRedeploy({
  projectId,
  projectSlug,
  version,
  lastFailed,
  gitUrl,
  branch,
}: {
  projectId: string;
  projectSlug: string;
  version: string;
  lastFailed: boolean;
  gitUrl: string;
  branch: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const redeploy = () => {
    setError(null);
    startTransition(async () => {
      const result = await redeployAction(projectId, { gitUrl, branch });
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  };

  return (
    <Card className="mb-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">
            {lastFailed
              ? `The last attempt (${version}) failed — the same source, tried again.`
              : `Already at ${version} — the same source, the newest commit.`}
          </p>
          <p className="mt-0.5 text-xs text-text-dim">
            One press builds it. The wizard below is for when the source, the
            branch or the settings change.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectSlug}/deployments`}
            className="text-xs text-accent hover:underline"
          >
            The deployments
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={redeploy}
            disabled={pending || !gitUrl}
          >
            {pending ? 'Building…' : 'Redeploy'}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-danger">{error}</p>
      ) : null}
    </Card>
  );
}
