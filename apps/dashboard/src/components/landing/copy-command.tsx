'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ComputerTerminal01Icon, Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

const COMMAND = 'curl -sSL https://deploy.fidscript.com/install.sh | bash';

export function CopyCommand() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-[var(--rail)] bg-[var(--surface-2)]/90 p-2 pl-4 shadow-2xl">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <HugeiconsIcon icon={ComputerTerminal01Icon} size={16} color="currentColor" className="shrink-0 text-[var(--accent)]" />
        <code className="truncate font-mono text-sm text-[var(--text-muted)]">{COMMAND}</code>
      </div>
      <button
        onClick={copy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--rail-light)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
      >
        <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} color="currentColor" className={copied ? 'text-[var(--success)]' : ''} />
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
