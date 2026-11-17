'use client';

import { useState } from 'react';

import Link from 'next/link';
import { Check, Copy, Globe, Rocket } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { GitIntegrationStatus } from '@/lib/api/resources';

/**
 * The application's own face on the deployments screen, Vercel-style.
 *
 * The logo is the live application's own favicon, read from where it is
 * published — not a stored copy. When there is nothing live yet, or the
 * icon cannot be read, the name's first letter stands in for it.
 *
 * The address is the domain the live deployment answers on: open it, or
 * copy it. And the last line says what the platform will do on its own:
 * pushes to the connected branch build and replace it — with the way to
 * turn that on when it is not yet.
 */
export function DeploymentProjectHeader({
  projectName,
  liveUrl,
  liveState,
  git,
}: {
  projectName: string;
  liveUrl: string | null;
  liveState: 'live' | 'building' | 'none';
  /** The Git status, when the platform's read of it succeeded. */
  git: GitIntegrationStatus | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!liveUrl) return;
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the clipboard is not available — nothing to do */
    }
  };

  return (
    <Card className="mb-4 p-4">
      <div className="flex items-center gap-3">
        <AppFavicon liveUrl={liveUrl} name={projectName} />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text">
              {projectName}
            </span>
            {liveState === 'live' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
                Live
              </span>
            ) : liveState === 'building' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-warning">
                Building
              </span>
            ) : null}
          </p>
          {liveUrl ? (
            <div className="mt-0.5 flex items-center gap-2">
              <Globe className="size-3.5 flex-shrink-0 text-text-dim" aria-hidden />
              <Link
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate font-mono text-xs text-text-muted transition-colors hover:text-text"
              >
                {liveUrl.replace(/^https?:\/\//, '')}
              </Link>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy the address"
                className="text-text-dim transition-colors hover:text-text"
              >
                {copied ? (
                  <Check className="size-3.5 text-success" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </button>
            </div>
          ) : (
            <p className="mt-0.5 font-mono text-xs text-text-dim">
              {liveState === 'building'
                ? 'A new version is building…'
                : 'No live address yet'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-rail-light pt-3">
        <Rocket className="mt-0.5 size-3.5 flex-shrink-0 text-text-dim" aria-hidden />
        <AutoDeployNote liveState={liveState} git={git} />
      </div>
    </Card>
  );
}

/** The application's published favicon, with a letter standing in for it. */
function AppFavicon({ liveUrl, name }: { liveUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const src = liveUrl ? `${liveUrl.replace(/\/$/, '')}/favicon.ico` : null;
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-rail bg-surface-3 font-mono text-base font-bold text-text-muted"
      >
        {name.trim().charAt(0).toUpperCase() || '·'}
      </span>
    );
  }
  return (
    <img
      src={src}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      alt=""
      aria-hidden
      className="size-9 flex-shrink-0 rounded-lg border border-rail bg-surface object-contain p-0.5"
    />
  );
}

/**
 * What the platform will do on its own, on the next push — and the way to
 * switch it on when it is not on yet. Every state is read, not guessed.
 */
function AutoDeployNote({
  liveState,
  git,
}: {
  liveState: 'live' | 'building' | 'none';
  git: GitIntegrationStatus | null;
}) {
  // Not connected, or the read failed: point at the way to connect.
  if (!git?.connected) {
    return (
      <p className="text-xs text-text-muted">
        <span className="font-medium text-text">Connect GitHub to deploy on push.</span>{' '}
        Every new commit on the branch then builds and goes live on its own —
        <Link
          href="/settings/integrations"
          className="ml-0.5 text-accent hover:underline"
        >
          connect an account
        </Link>
        .
      </p>
    );
  }

  const branch = git.branch ?? 'main';

  // Connected, but pushes do not deploy yet.
  if (!git.autoDeploy) {
    return (
      <p className="text-xs text-warning">
        <span className="font-medium">Pushes do not deploy yet.</span> Turn on
        {' '}
        <span className="font-mono text-[11px]">Deploy on push</span> in the Git
        card below, and every push to <span className="font-mono">{branch}</span>{' '}
        will build and replace the live deployment on its own.
      </p>
    );
  }

  // Pushes deploy — but the webhook that carries them is not registered.
  if (!git.webhook.registered) {
    return (
      <p className="text-xs text-warning">
        <span className="font-medium">The push webhook is not registered,</span> so
        pushes will not deploy. Register it in the Git card below, and every
        push to <span className="font-mono">{branch}</span> builds on its own.
      </p>
    );
  }

  // The fully automatic case: say what it does, and flag a commit the
  // platform knows is ahead of what is live.
  const aheadOf =
    git.lastCommit &&
    git.lastDeployedCommit &&
    git.lastCommit.sha !== git.lastDeployedCommit
      ? git.lastCommit.sha.slice(0, 7)
      : null;

  return (
    <p className="text-xs text-text-muted">
      <span className="font-medium text-success">Auto-deploys on every push</span>{' '}
      to <span className="font-mono">{branch}</span>.
      {aheadOf ? (
        <span className="mt-0.5 block text-warning">
          The newest commit, {aheadOf}, is not live yet — the next push builds
          it on its own.
        </span>
      ) : liveState === 'none' ? (
        <span className="mt-0.5 block text-text-dim">
          No live address yet — the first deployment is still to come.
        </span>
      ) : null}
    </p>
  );
}
