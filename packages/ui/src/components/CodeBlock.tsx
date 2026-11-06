import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  /** What the code is — announced before it. */
  label?: string;
  language?: string;
  /** Whether the copy button is offered. */
  copyable?: boolean;
  className?: string;
}

/**
 * A piece of configuration, with the copy button that goes with it.
 *
 * The code is selectable and the copy is announced when it happens — a
 * button that changes silently is a button the person cannot trust.
 */
export function CodeBlock({
  code,
  label = 'Configuration',
  language,
  copyable = true,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`rounded-md border border-[var(--rail)] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)] border-b border-[var(--rail)]">
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
          {language ? `${label} · ${language}` : label}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] rounded px-1"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <pre className="overflow-x-auto p-3 text-xs font-mono text-[var(--text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
