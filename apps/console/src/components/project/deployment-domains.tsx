'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import {
  attachDomainAction,
  detachDomainAction,
} from '@/app/(project)/projects/[projectId]/deployments/[deploymentId]/actions';

/**
 * The names this deployment answers on.
 *
 * The project's domains are listed; one of them can be pointed at this
 * deployment, and one that is pointed can be taken back off. The routing
 * follows the moment it is done — that is the platform's work, not the
 * operator's.
 */
export function DeploymentDomains({
  projectId,
  deploymentId,
  domains,
}: {
  projectId: string;
  deploymentId: string;
  domains: Array<{ id: string; domain: string; deploymentId: string | null }>;
}) {
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const attached = domains.filter(
    (entry) => entry.deploymentId === deploymentId,
  );
  const available = domains.filter(
    (entry) => entry.deploymentId !== deploymentId && !entry.deploymentId,
  );

  const attach = () => {
    setError(null);
    if (!chosen) return;
    startTransition(async () => {
      const result = await attachDomainAction(projectId, deploymentId, chosen);
      if (result.error) setError(result.error);
    });
  };

  const detach = (domainId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await detachDomainAction(projectId, domainId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {attached.length > 0 ? (
        <ul className="divide-y divide-rail">
          {attached.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="truncate text-sm text-text">{entry.domain}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => detach(entry.id)}
                loading={pending}
              >
                Take it off
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-dim">
          The deployment answers on its own address under the platform&apos;s
          domain. A name of the project&apos;s own can be pointed here.
        </p>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="A domain of the project"
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            options={available.map((entry) => ({
              value: entry.id,
              label: entry.domain,
            }))}
            className="max-w-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={attach}
            disabled={!chosen}
            loading={pending}
          >
            Point it here
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
