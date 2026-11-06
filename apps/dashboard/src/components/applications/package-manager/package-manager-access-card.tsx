'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Link01Icon, Key01Icon } from '@hugeicons/core-free-icons';

interface PackageManagerAccessCardProps {
  registryUrl: string | null;
  tokenUrl: string | null;
  reachable: boolean;
}

/**
 * The console, and the way into it.
 *
 * The registry's console shows the private packages only to a signed-in
 * visitor, so the token page is the way in — it was the way in before, and
 * the page went missing when the edge changed. Both links are here.
 */
export function PackageManagerAccessCard({
  registryUrl,
  tokenUrl,
  reachable,
}: PackageManagerAccessCardProps) {
  const [copied, setCopied] = useState('');

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  }

  if (!registryUrl) {
    return (
      <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
        <p className="text-sm text-[var(--text-muted)]">
          The package manager is not available on this platform.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">The console, and your token</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            The private registry holds the internal <code className="font-mono">@soostori</code> and{' '}
            <code className="font-mono">@nextmavens</code> packages. The console shows them to a
            signed-in visitor — so the first thing to do is get a token.
          </p>
        </div>
        <a
          href={registryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text)] text-xs font-medium hover:opacity-90 flex-shrink-0"
        >
          <HugeiconsIcon icon={Link01Icon} size={13} />
          Open the console
        </a>
      </div>

      <div className="space-y-2">
        <AccessRow
          label="Registry"
          value={registryUrl}
          copied={copied === 'Registry'}
          onCopy={() => copy('Registry', registryUrl)}
        />
        {tokenUrl && (
          <AccessRow
            label="Token page"
            value={tokenUrl}
            copied={copied === 'Token page'}
            onCopy={() => copy('Token page', tokenUrl)}
            action={
              <a
                href={tokenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--rail)] text-[var(--text)] text-xs font-medium hover:opacity-90"
              >
                <HugeiconsIcon icon={Key01Icon} size={13} />
                Get a token
              </a>
            }
          />
        )}
      </div>

      {!reachable && (
        <p className="text-xs text-[var(--warning)] mt-3">
          The registry did not answer, so the package list below may be out of date.
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Install a package with the token you got:</p>
        <code className="block px-3 py-2 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-xs font-mono text-[var(--text)] overflow-x-auto">
          npm install --registry={registryUrl} @soostori/core
        </code>
      </div>
    </div>
  );
}

interface AccessRowProps {
  label: string;
  value: string;
  copied?: boolean;
  onCopy: () => void;
  action?: React.ReactNode;
}

function AccessRow({ label, value, copied, onCopy, action }: AccessRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-24 flex-shrink-0">{label}</span>
      <code className="flex-1 min-w-0 truncate px-2.5 py-1.5 rounded bg-[var(--surface-2)] border border-[var(--rail)] text-xs font-mono text-[var(--text)]">
        {value}
      </code>
      {action}
      <Button variant="ghost" size="sm" onClick={onCopy} className="p-1.5" aria-label={`Copy the ${label}`}>
        <HugeiconsIcon icon={Copy01Icon} size={13} className={copied ? 'text-[var(--success)]' : ''} />
      </Button>
    </div>
  );
}
