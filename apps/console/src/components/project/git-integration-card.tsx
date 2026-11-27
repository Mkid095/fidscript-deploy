'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { GitIntegrationStatus } from '@/lib/api/resources';
import {
  reconnectWebhookAction,
  setAutoDeployAction,
} from '@/app/(project)/projects/[projectId]/deployments/actions';

/**
 * The project's Git, on the deployments screen.
 *
 * What is connected and what is live: the account, the repository and
 * branch, the last commit, the commit that is live, whether pushes deploy,
 * and whether the webhook that carries them is registered. Every line is
 * the platform's own answer, not a guess — a webhook says registered only
 * when the platform stores the hook id GitHub gave it, and "not
 * connected" points at the screen that connects it.
 *
 * The controls: the auto-deploy switch, and the webhook (re-)registration.
 * New versions are not deployed by hand here — a push to the branch
 * builds them, and this card says whether that is on.
 */
export function GitIntegrationCard({
  projectId,
  projectSlug,
  status,
}: {
  status: GitIntegrationStatus;
  projectSlug: string;
  projectId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const repo = status.repository
    ? status.repository
        .replace(/^https?:\/\/(www\.)?github\.com\//, '')
        .replace(/\.git$/, '')
    : null;
  const repoUrl = repo ? `https://github.com/${repo}` : null;

  const setAutoDeploy = (enabled: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setAutoDeployAction(projectId, enabled);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  };

  const reconnect = () => {
    setError(null);
    startTransition(async () => {
      const result = await reconnectWebhookAction(projectId);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  };

  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-text">Git</p>
        {repoUrl ? (
          <Link
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            {repo}
          </Link>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-text-dim">Account</dt>
          <dd className="mt-0.5 text-text">
            {status.connected ? (
              <a
                href={`https://github.com/${status.account ?? ''}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {status.account ?? 'GitHub'}
              </a>
            ) : (
              <span className="text-text-dim">
                Not connected —{' '}
                <Link
                  href="/settings/integrations"
                  className="text-accent hover:underline"
                >
                  connect GitHub
                </Link>{' '}
                to deploy by push.
              </span>
            )}
          </dd>
          {status.tokenNote ? (
            <p className="mt-0.5 text-danger">{status.tokenNote}</p>
          ) : null}
        </div>
        <div>
          <dt className="text-text-dim">Branch</dt>
          <dd className="mt-0.5 text-text">{status.branch}</dd>
        </div>
        <div>
          <dt className="text-text-dim">Last commit</dt>
          <dd className="mt-0.5 break-all text-text">
            {status.lastCommit ? (
              <>
                <Link
                  href={
                    repoUrl ? `${repoUrl}/commit/${status.lastCommit.sha}` : '#'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {status.lastCommit.sha.slice(0, 7)}
                </Link>{' '}
                <span className="text-text-dim">
                  {status.lastCommit.message.slice(0, 60)}
                </span>
              </>
            ) : (
              <span className="text-text-dim">None built yet.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-text-dim">What is live</dt>
          <dd className="mt-0.5 text-text">
            {status.lastDeployedCommit ? (
              <>
                <span className="font-mono">
                  {status.lastDeployedCommit.slice(0, 7)}
                </span>{' '}
                is live
                {status.lastCommit &&
                status.lastCommit.sha !== status.lastDeployedCommit ? (
                  <span className="block text-warning">
                    the newest commit,{' '}
                    <span className="font-mono">
                      {status.lastCommit.sha.slice(0, 7)}
                    </span>
                    , is ahead of it
                  </span>
                ) : null}
              </>
            ) : status.lastSuccess ? (
              <span className="text-text-dim">
                A build is live — its commit was not recorded. The next
                deployment records it.
              </span>
            ) : (
              <span className="text-text-dim">Nothing built yet.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-text-dim">Webhook</dt>
          <dd className="mt-0.5 text-text">
            {status.webhook.registered ? (
              <span>
                Registered
                {status.webhook.hookId ? (
                  <span className="text-text-dim">
                    {' '}
                    (#{status.webhook.hookId})
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-text-dim">
                Not registered — pushes will not deploy.
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rail-light pt-3">
        <Switch
          label="Deploy on push"
          description={`Every push to ${status.branch} builds and replaces the live deployment.`}
          checked={status.autoDeploy}
          onChange={setAutoDeploy}
          disabled={pending || !repo}
        />
        <div className="flex flex-wrap items-center gap-2">
          {status.repository ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={reconnect}
              disabled={pending}
            >
              {status.webhook.registered
                ? 'Re-register webhook'
                : 'Register webhook'}
            </Button>
          ) : null}
          <Link
            href={`/projects/${projectSlug}/deployments`}
            className="text-xs text-accent hover:underline"
          >
            The deployments
          </Link>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </Card>
  );
}
