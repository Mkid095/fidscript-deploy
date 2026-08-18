'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CopyIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} type="button"
      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
      <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : CopyIcon} size={13} />
      {copied ? 'Copied!' : label}
    </button>
  );
}
