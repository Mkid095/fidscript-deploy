'use client';

import { useState } from 'react';

/**
 * A block of code, with a button that copies it.
 *
 * The button says what it did — "Copied" — so a person knows it worked
 * without having to trust that nothing happened.
 */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-rail bg-surface-2">
      <div className="flex items-center justify-between gap-2 border-b border-rail px-3 py-1.5">
        <span className="text-[11px] font-medium text-text-dim">{label ?? 'Code'}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] text-text-muted transition-colors hover:text-text"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-xs leading-relaxed text-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}
