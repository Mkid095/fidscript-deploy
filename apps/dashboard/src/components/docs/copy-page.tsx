'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

/** Copies the rendered text of the active doc page (the [data-doc-content] node). */
export function CopyPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const el = document.querySelector('[data-doc-content]') as HTMLElement | null;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--rail)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
    >
      <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} color="currentColor" className={copied ? 'text-[var(--success)]' : ''} />
      {copied ? 'Copied' : 'Copy page'}
    </button>
  );
}
