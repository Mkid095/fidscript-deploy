'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/feedback';

/**
 * The project's environment.
 *
 * The values come from the API, which decides who may see them: the owner
 * and the admins see the value, everybody else sees `[masked]`.
 *
 * The console **masks them anyway** — a secret is not something to leave
 * sitting on a screen, and it is not something a screenshot should carry.
 * They are revealed one at a time, and only on purpose.
 */
export function ProjectEnvVars({
  variables,
}: {
  variables: Array<{ key: string; value: string; encrypted: boolean }>;
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  if (variables.length === 0) {
    return (
      <EmptyState
        title="No variables yet"
        body="The variables a deployment ships with are set here."
      />
    );
  }

  return (
    <ul className="divide-y divide-rail">
      {variables.map((variable) => {
        const shown = revealed[variable.key];
        const masked = variable.value === '[masked]';
        return (
          <li key={variable.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-text">{variable.key}</p>
              <p className="truncate text-xs text-text-dim">
                {masked ? 'hidden — you may not see this value' : shown ? variable.value : '••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {variable.encrypted ? <Badge tone="neutral">Encrypted</Badge> : null}
              {masked ? null : (
                <button
                  type="button"
                  onClick={() => setRevealed({ ...revealed, [variable.key]: !shown })}
                  className="text-[11px] text-text-muted transition-colors hover:text-text"
                >
                  {shown ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
