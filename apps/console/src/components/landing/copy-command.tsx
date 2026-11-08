'use client';

import { useState } from 'react';

const COMMAND = 'curl -sSL https://fidscript.com/install.sh | bash';

/**
 * The install command, and a button that copies it.
 *
 * The copy is announced when it happens: a button that changes silently is
 * a button nobody can trust.
 */
export function CopyCommand() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-rail bg-surface-2 p-2 pl-4 shadow-lg">
      <code className="truncate font-mono text-sm text-text-muted">
        {COMMAND}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="shrink-0 rounded-lg border border-rail-light bg-surface px-3 py-2 text-xs font-semibold text-text transition hover:border-accent/40"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
