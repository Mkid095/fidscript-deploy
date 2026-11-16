'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ErrorState } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

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
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok?: boolean; error?: string }>,
    message?: string,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        toast.error('That did not work', result.error);
        return;
      }
      if (message) toast.success(message);
      router.refresh();
    });
  };

  const running =
    status.toUpperCase() === 'SUCCESS' ||
    status.toUpperCase() === 'DEPLOYING' ||
    status.toUpperCase() === 'BUILDING';
  const stopped =
    status.toUpperCase() === 'STOPPED' || status.toUpperCase() === 'FAILED';

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

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          run(
            () => destroyDeploymentAction(projectId, deploymentId),
            'The deployment was removed.',
          )
        }
        title="Remove this deployment?"
        body="The container, the image and the record are gone. This cannot be undone."
        confirmLabel="Remove it for good"
        pending={pending}
      />

      <Switch
        label="Deploy on every push"
        description="When the branch is pushed to, a new deployment is made."
        checked={autoDeploy}
        onChange={(next) => run(() => setAutoDeployAction(projectId, next))}
      />

      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
