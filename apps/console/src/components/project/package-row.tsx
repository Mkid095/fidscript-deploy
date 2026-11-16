'use client';

import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import type { RegistryPackage } from '@/lib/api/packages';

/**
 * One package in the registry.
 *
 * It opens to show what is in it: the versions, the tags, and the README it
 * was published with.
 */
export function PackageRow({
  entry,
  detail,
}: {
  entry: RegistryPackage;
  detail: {
    name: string;
    description?: string;
    latest?: string;
    tags: Record<string, string>;
    versions: string[];
    readme?: string;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending] = useTransition();

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-text">{entry.name}</p>
          {entry.description ? (
            <p className="mt-0.5 truncate text-xs text-text-dim">
              {entry.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">
            {entry.versions.length} version
            {entry.versions.length === 1 ? '' : 's'}
          </span>
          {entry.latest ? <Badge tone="neutral">{entry.latest}</Badge> : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(!open)}
            loading={pending}
          >
            {open ? 'Close' : 'Open'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 rounded-md border border-rail bg-surface-2 p-3">
          {detail ? (
            <>
              {Object.keys(detail.tags).length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-text-muted">Tags</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {Object.entries(detail.tags).map(([tag, version]) => (
                      <span key={tag} className="text-xs text-text-dim">
                        <span className="font-mono text-text">{tag}</span> →{' '}
                        {version}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium text-text-muted">Versions</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {detail.versions.map((version) => (
                    <span key={version} className="font-mono text-xs text-text">
                      {version}
                    </span>
                  ))}
                </div>
              </div>

              {detail.readme ? (
                <div>
                  <p className="text-xs font-medium text-text-muted">
                    The README
                  </p>
                  <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-text-muted">
                    {detail.readme.slice(0, 2000)}
                  </pre>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-text-dim">
              The registry did not answer with the details of this package.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
