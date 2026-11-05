'use client';

import { useCallback, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon } from '@hugeicons/core-free-icons';
import type { InstantClientConfig } from './instant-types';

interface InstantClientConfigBlockProps {
  config: InstantClientConfig;
}

/**
 * The configuration a deployed application needs to reach its data plane.
 *
 * The admin token is not here, and must not be: it is the platform's
 * credential. An application authenticates with its own user token, and
 * Instant evaluates its permission rules before sending anything.
 */
export function InstantClientConfigBlock({ config }: InstantClientConfigBlockProps) {
  const [copied, setCopied] = useState(false);

  const snippet = JSON.stringify(
    { apiHost: config.apiHost, appId: config.appId },
    null,
    2,
  );

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet]);

  return (
    <div className="mt-3 rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
          Client config
        </p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          <HugeiconsIcon icon={Copy01Icon} size={12} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto text-[11px] font-mono text-[var(--text)]">
        {snippet}
      </pre>
    </div>
  );
}
