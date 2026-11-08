'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { browserApi } from '@/lib/api/browser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { BuildLogViewer } from '@/components/project/build-log-viewer';

interface Deployment {
  id: string;
  status: string;
  deploymentUrl: string | null;
  release?: { version: string | null; branch: string | null } | null;
}

/**
 * The build, while it happens.
 *
 * The deployment is asked for every few seconds, and the build log is read
 * from the same place — so what is shown is what the platform saw.
 */
export function DeploymentProgressStep({
  projectId,
  projectSlug,
  deploymentId,
  remainingApps = [],
  onDeployAnother,
}: {
  projectId: string;
  projectSlug: string;
  deploymentId: string;
  /** The monorepo's other applications, when the repository holds several. */
  remainingApps?: Array<{ path: string; name: string; frameworkLabel: string }>;
  onDeployAnother?: (path: string) => void;
}) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const result = await browserApi.get<Deployment>(
          `/projects/${projectId}/deployments/${deploymentId}`,
        );
        if (cancelled) return;
        setDeployment(result);
        setError(null);

        // The log grows while the build runs, so it is read again and again
        // and what is new is added. The platform has no stream for it — the
        // build log is read where it is kept.
        const log = await browserApi
          .get<{
            logs: string;
          }>(`/projects/${projectId}/deployments/${deploymentId}/logs`)
          .catch(() => ({ logs: '' }));
        if (!cancelled)
          setLogs((current) =>
            (log.logs ?? '').length > current.length ? log.logs : current,
          );

        if (
          result.status === 'SUCCESS' ||
          result.status === 'FAILED' ||
          result.status === 'STOPPED'
        ) {
          return;
        }

        timer = setTimeout(poll, 2000);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'The deployment could not be read.',
        );
        timer = setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, deploymentId]);

  const status = deployment?.status ?? 'PENDING';
  const finished =
    status === 'SUCCESS' || status === 'FAILED' || status === 'STOPPED';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text">
          {deployment?.release?.version ?? 'The deployment'} ·{' '}
          {status.toLowerCase()}
        </p>
        <Badge
          tone={
            status === 'SUCCESS'
              ? 'success'
              : status === 'FAILED'
                ? 'danger'
                : 'warning'
          }
        >
          {status.toLowerCase()}
        </Badge>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <BuildLogViewer logs={logs} status={status} />

      {status === 'SUCCESS' && deployment?.deploymentUrl ? (
        <div className="space-y-3">
          <a
            href={deployment.deploymentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent hover:underline"
          >
            {deployment.deploymentUrl}
          </a>
          {remainingApps.length > 0 ? (
            <div className="rounded-lg border border-rail bg-surface-2 p-3">
              <p className="text-xs text-text-muted">
                The repository also holds{' '}
                {remainingApps.map((app, index) => (
                  <span key={app.path}>
                    {index > 0 ? ', ' : ''}
                    <span className="font-medium text-text">{app.name}</span>
                    <span className="text-text-dim">
                      {' '}
                      ({app.frameworkLabel})
                    </span>
                  </span>
                ))}
                . This project deploys one application at a time — the next one
                is configured the same way.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {remainingApps.map((app) => (
                  <Button
                    key={app.path}
                    variant="secondary"
                    size="sm"
                    onClick={() => onDeployAnother?.(app.path)}
                  >
                    Deploy {app.name} next
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${projectSlug}/domains`}>
              <Button variant="secondary" size="sm">
                Add a domain
              </Button>
            </Link>
            <Link href={`/projects/${projectSlug}/deployments`}>
              <Button variant="ghost" size="sm">
                All deployments
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
