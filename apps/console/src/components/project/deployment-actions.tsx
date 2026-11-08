'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ErrorState } from '@/components/ui/feedback';

import {
  destroyDeploymentAction,
  redeployAction,
  restartDeploymentAction,
  rollbackDeploymentAction,
  setAutoDeployAction,
  stopDeploymentAction,
} from '@/app/(project)/projects/[projectId]/deployments/actions';

/**
 * What can be done to a deployment.
 *
 * The buttons that apply are the ones that apply: a deployment that is
 * running cannot be started again, and one that is stopped cannot be
 * stopped twice.
 */
export function DeploymentActions({
  projectId,
  deploymentId,
  status,
  autoDeploy,
  gitUrl,
  branch,
}: {
  projectId: string;
  deploymentId: string;
  status: string;
  autoDeploy: boolean;
  /** The source it was built from — what a redeploy builds again. */
  gitUrl?: string | null;
  branch?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok?: boolean; error?: string }>,
    message?: string,
  ) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else {
        if (message) setNotice(message);
        router.refresh();
      }
    });
  };

  const running =
    status === 'SUCCESS' || status === 'DEPLOYING' || status === 'BUILDING';
  const stopped = status === 'STOPPED' || status === 'FAILED';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() =>
              run(() => stopDeploymentAction(projectId, deploymentId))
            }
          >
            Stop it
          </Button>
        ) : null}
        {stopped ? (
          <Button
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() =>
              run(() => restartDeploymentAction(projectId, deploymentId))
            }
          >
            Start it again
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          loading={pending}
          onClick={() =>
            run(() => rollbackDeploymentAction(projectId, deploymentId))
          }
        >
          Roll back
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={!gitUrl}
          onClick={() =>
            run(
              () =>
                redeployAction(projectId, {
                  gitUrl: gitUrl ?? '',
                  branch: branch ?? 'main',
                }),
              'It is building again.',
            )
          }
        >
          Deploy it again
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(!confirming)}
        >
          Remove it
        </Button>
      </div>

      {confirming ? (
        <div className="rounded-md border border-danger/40 bg-danger/5 p-3">
          <p className="text-xs text-text-muted">
            The container, the image and the record are gone. This cannot be
            undone.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                run(() => destroyDeploymentAction(projectId, deploymentId))
              }
            >
              Remove it for good
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      <Switch
        label="Deploy on every push"
        description="When the branch is pushed to, a new deployment is made."
        checked={autoDeploy}
        onChange={(next) => run(() => setAutoDeployAction(projectId, next))}
      />

      {error ? <ErrorState message={error} /> : null}
      {notice ? <p className="text-xs text-success">{notice}</p> : null}
    </div>
  );
}
