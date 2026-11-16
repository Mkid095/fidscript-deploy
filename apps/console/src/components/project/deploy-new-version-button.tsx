'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { redeployAction } from '@/app/(project)/projects/[projectId]/deployments/actions';

/**
 * The one-press next version.
 *
 * An initialized project does not redo the initializer for its next
 * version: one press builds the newest commit of the branch the
 * deployment has been running on. The history screen is where the result
 * shows up — the page reloads when the build is queued.
 */
export function DeployNewVersionButton({
  projectId,
  version,
  lastFailed,
  gitUrl,
  branch,
}: {
  projectId: string;
  version: string;
  lastFailed: boolean;
  gitUrl: string;
  branch: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const deploy = () => {
    setError(null);
    startTransition(async () => {
      const result = await redeployAction(projectId, { gitUrl, branch });
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size="sm"
        onClick={deploy}
        disabled={pending}
      >
        {pending ? 'Queuing the build…' : 'Deploy new version'}
      </Button>
      <span className="text-xs text-text-dim">
        {lastFailed
          ? `The last attempt (${version}) failed — the same source, tried again.`
          : `The newest commit of ${branch}, under the project's deployment.`}
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
