'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, CheckmarkCircle01Icon, LoadingIcon } from '@hugeicons/core-free-icons';
import type { InstallJob } from '@fidscript-deploy/sdk';

/**
 * The installer's own output, while an application installs.
 *
 * It is the installer's output verbatim — what the operator would have seen
 * had they run `fidscript-addons enable` themselves. Showing it is the
 * difference between "something is happening" and "here is what is
 * happening".
 */
export function InstallLog({ install }: { install: InstallJob }) {
  const failed = install.status === 'failed';
  const running = install.status === 'running';

  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={failed ? Alert02Icon : running ? LoadingIcon : CheckmarkCircle01Icon}
          size={15}
          className={failed ? 'text-rose-400' : running ? 'text-[var(--text-dim)]' : 'text-emerald-400'}
        />
        <h3 className="text-sm font-medium text-[var(--text)]">
          {failed ? 'Install failed' : running ? 'Installing…' : 'Installed'}
        </h3>
      </div>

      {install.error && (
        <p className="mt-2 text-xs text-rose-400">{install.error}</p>
      )}

      {install.output && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3 text-[11px] font-mono text-[var(--text-dim)] whitespace-pre-wrap">
          {install.output}
        </pre>
      )}

      {!install.output && running && (
        <p className="mt-3 text-xs text-[var(--text-dim)]">
          Waiting for the installer to say something…
        </p>
      )}
    </div>
  );
}
