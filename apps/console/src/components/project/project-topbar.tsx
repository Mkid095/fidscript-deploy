'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Plus, ShieldCheck } from 'lucide-react';

/**
 * The project's top bar.
 *
 * It is the place the work lives: which project, what is live on the
 * platform right now, and the one button that matters — a new deployment.
 * It sits above the screen; the screen scrolls beneath it.
 *
 * It names the **project**, not the screen: the screen's own title is the
 * page's, so this bar and the page are one bar a level apart, not one
 * title said twice.
 */
export function ProjectTopbar({
  projectName,
  projectPath,
  liveUrl,
  liveState,
  deploymentOn,
}: {
  projectName: string;
  /** `/projects/<slug>`. */
  projectPath: string;
  /** The project's live application's address, when one is up. */
  liveUrl: string | null;
  liveState: 'live' | 'building' | 'none';
  deploymentOn: boolean;
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
    <div className="border-b border-rail bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        {/* Which project, and the way back to them all. */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-xs font-mono text-text-dim"
        >
          <Link href="/projects" className="transition-colors hover:text-text">
            Projects
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-sm font-semibold text-text">
            {projectName}
          </span>
        </nav>

        {/* What is live, and the way to the next deployment. */}
        <div className="flex shrink-0 items-center gap-2.5">
          {liveState === 'live' && liveUrl ? (
            <div className="hidden items-center gap-2 rounded-lg border border-rail bg-surface-2 px-3 py-1.5 font-mono text-xs sm:flex">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              <Link
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="max-w-[200px] truncate text-text-muted transition-colors hover:text-text"
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
          ) : liveState === 'building' ? (
            <span className="hidden font-mono text-xs text-warning sm:inline">
              building…
            </span>
          ) : null}

          {deploymentOn ? (
            <Link
              href={`${projectPath}/deployments/new`}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <Plus className="size-3.5" aria-hidden />
              New deployment
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

