'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ExternalLinkIcon, Copy01Icon } from '@hugeicons/core-free-icons';

interface DeploymentUrlProps {
  url: string;
  onCopy: () => void;
}

export function DeploymentUrl({ url, onCopy }: DeploymentUrlProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        <HugeiconsIcon icon={ExternalLinkIcon} size={13} />
        <span className="truncate max-w-[200px] sm:max-w-[400px]">{url.replace(/^https?:\/\//, '')}</span>
      </a>
      <button
        onClick={() => { navigator.clipboard.writeText(url); onCopy(); }}
        className="text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors flex-shrink-0"
        title="Copy URL"
      >
        <HugeiconsIcon icon={Copy01Icon} size={12} />
      </button>
    </div>
  );
}
