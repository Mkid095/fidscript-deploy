'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, CheckmarkCircle03Icon } from '@hugeicons/core-free-icons';

interface MetadataRowProps {
  icon: typeof Copy01Icon;
  label: string;
  value?: string | null;
  mono?: boolean;
  copyable?: boolean;
  className?: string;
}

export function MetadataRow({ icon: Icon, label, value, mono, copyable, className }: MetadataRowProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  function handleCopy() {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className={`flex items-start gap-3 ${className ?? ''}`}>
      <HugeiconsIcon icon={Icon} size={14} className="text-[var(--text-dim)] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-dim)] mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p className={`text-sm text-[var(--text)] truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
          {copyable && (
            <button
              onClick={handleCopy}
              className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors flex-shrink-0"
              title="Copy"
            >
              <HugeiconsIcon
                icon={copied ? CheckmarkCircle03Icon : Copy01Icon}
                size={12}
                className={copied ? 'text-[var(--success)]' : ''}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
