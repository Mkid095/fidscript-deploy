'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CopyIcon } from '@hugeicons/core-free-icons';

/** Copy a piece of text to the clipboard, with a short confirmation. */
export function McpCopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      type="button"
      className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
    >
      <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : CopyIcon} size={13} />
      {copied ? 'Copied!' : label}
    </button>
  );
}

/** A block of setup code, with a copy button. */
export function McpCodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative">
      {label && (
        <p className="text-[var(--text-dim)] text-xs mb-1 font-medium">{label}</p>
      )}
      <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--rail)] rounded-md px-3 py-2">
        <code className="text-xs font-mono text-[var(--text)] break-all">{code}</code>
        <McpCopyButton text={code} />
      </div>
    </div>
  );
}
