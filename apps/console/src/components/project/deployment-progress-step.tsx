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
  error?: string | null;
  release?: { version: string | null; branch: string | null } | null;
}

/** The phases a deployment walks, in the order the build log shows them. */
const PHASES = ['Queued', 'Building', 'Deploying', 'Ready'] as const;

/** A status as the phase row reads it. */
function phaseOf(status: string): { index: number; failed: boolean } {
  switch (status) {
    case 'PENDING':
    case 'QUEUED':
      return { index: 0, failed: false };
    case 'BUILDING':
      return { index: 1, failed: false };
    case 'DEPLOYING':
      return { index: 2, failed: false };
    case 'SUCCESS':
      return { index: 3, failed: false };
    default:
      // FAILED, STOPPED, CANCELED — the phase it stopped in says which.
      return { index: 1, failed: true };
  }
}

/** A rough width for the bar, from the phase alone. */
function progressOf(status: string): number {
  switch (status) {
    case 'PENDING':
    case 'QUEUED':
      return 8;
    case 'BUILDING':
      return 45;
    case 'DEPLOYING':
      return 82;
    case 'SUCCESS':
      return 100;
    default:
      return 45;
  }
}

/**
 * The build, while it happens.
 *
 * The deployment is asked for every few seconds, and the build log is read
 * from the same place — so what is shown is what the platform saw. The
 * phases walk the bar as the status moves, and a build that failed says so
 * with the way back: deploy the same settings again.
 */
export function DeploymentProgressStep({
  projectId,
  projectSlug,
  deploymentId,
  deployLabel,
  onRetry,
  remainingApps = [],
  onDeployAnother,
}: {
  projectId: string;
  projectSlug: string;
  deploymentId: string;
  /** What this deployment is doing to the project's live application, if anything. */
  deployLabel?: string;
  /** Start the same deployment again — the settings are already said. */
  onRetry?: () => void;
  /** The monorepo's other applications, when the repository holds several. */
  remainingApps?: Array<{ path: string; name: string; frameworkLabel: string }>;
  onDeployAnother?: (path: string) => void;
}) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // The clock runs while the deployment is on the move, and stops when it
  // is not — the seconds a build took are one of the facts worth reading.
  useEffect(() => {
    setElapsed(0);
    const startedAt = Date.now();
    const clock = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(clock);
  }, [deploymentId]);

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
          .get<{ logs: string }>(
            `/projects/${projectId}/deployments/${deploymentId}/logs`,
          )
          .catch(() => ({ logs: '' }));
        if (!cancelled)
          setLogs((current) =>
            (log.logs ?? '').length > current.length ? log.logs : current,
          );

        const finishedStatus = (result.status ?? '').toUpperCase();
        if (
          finishedStatus === 'SUCCESS' ||
          finishedStatus === 'FAILED' ||
          finishedStatus === 'STOPPED'
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

  const status = (deployment?.status ?? 'PENDING').toUpperCase();
  const finished =
    status === 'SUCCESS' || status === 'FAILED' || status === 'STOPPED';
  const { index: phase, failed } = phaseOf(status);
  const failedMessage =
    deployment?.error ?? (failed ? 'The build did not finish.' : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {deployLabel
              ? `Deploying — ${deployLabel}`
              : deployment?.release?.version ?? 'The deployment'}
          </p>
          {deployment?.release?.branch ? (
            <p className="text-xs text-text-dim">
              branch {deployment.release.branch}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            tone={
              status === 'SUCCESS'
                ? 'success'
                : status === 'FAILED'
                  ? 'danger'
                  : 'warning'
            }
          >
            {status === 'SUCCESS' ? 'ready' : status.toLowerCase()}
          </Badge>
          {!finished ? (
            <span className="font-mono text-xs text-text-dim">{elapsed}s</span>
          ) : null}
        </div>
      </div>

      {/* The bar, and the phases it walks */}
      <div>
        <div
          className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${
            failed ? 'opacity-70' : ''
          }`}
          role="progressbar"
          aria-valuenow={progressOf(status)}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              failed ? 'bg-danger' : status === 'SUCCESS' ? 'bg-success' : 'bg-accent'
            }`}
            style={{ width: `${progressOf(status)}%` }}
          />
        </div>
        <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {PHASES.map((name, position) => {
            const done = !failed && position < phase;
            const current = !failed && position === phase;
            const isFailedHere = failed && position === phase;
            return (
              <li
                key={name}
                className={`flex items-center gap-1.5 text-xs ${
                  isFailedHere
                    ? 'text-danger'
                    : done
                      ? 'text-text'
                      : current
                        ? 'text-text'
                        : 'text-text-dim'
                }`}
              >
                {isFailedHere ? (
                  <span aria-hidden>✕</span>
                ) : done ? (
                  <span className="text-success" aria-hidden>
                    ✓
                  </span>
                ) : current ? (
                  <span
                    className="inline-block size-3 animate-spin rounded-full border-2 border-accent border-t-transparent"
                    aria-hidden
                  />
                ) : (
                  <span
                    className="inline-block size-2 rounded-full bg-surface-2"
                    aria-hidden
                  />
                )}
                {name}
              </li>
            );
          })}
        </ol>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {failed && failedMessage ? (
        <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3">
          <p className="text-sm font-medium text-danger">
            The deployment did not finish.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {failedMessage} The error is in the last lines of the log below —
            fix it in the repository, change the build settings, or start the
            same deployment again.
          </p>
        </div>
      ) : null}

      <BuildLogViewer logs={logs} status={status} />

      {status === 'SUCCESS' && deployment?.deploymentUrl ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/5 px-4 py-3">
            <a
              href={deployment.deploymentUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-sm text-accent hover:underline"
            >
              {deployment.deploymentUrl}
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigator.clipboard?.writeText(deployment.deploymentUrl ?? '')
              }
            >
              Copy
            </Button>
          </div>
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

      {failed && onRetry ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onRetry}>
            Deploy again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
