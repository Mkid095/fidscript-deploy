'use client';

import { useState, useTransition } from 'react';

import { Card, SectionHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { RegistryScope } from '@/lib/api/registry';

import { setScopeAccessAction } from '@/app/(platform)/settings/actions';

/**
 * The registry's scopes, and who may read each of them.
 *
 * A scope open for anonymous reads is what a plain deployment installs
 * from — no registry token needed, and the application's own .npmrc
 * carries only the address. Publishing stays closed: the rule decides
 * who reads, not who writes.
 */
export function RegistryScopeAccess({
  scopes,
}: {
  scopes: RegistryScope[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (scope: string, next: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setScopeAccessAction(scope, next);
      if (result.error) setError(result.error);
    });
  };

  return (
    <section>
      <SectionHeader
        title="The registry's scopes"
        description="Which of the registry's scopes answer without a token. Changing a rule rewrites the registry's config and restarts it — installs through the registry pause for a few seconds."
      />
      <Card className="divide-y divide-rail">
        {scopes.length === 0 ? (
          <p className="p-4 text-xs leading-relaxed text-text-dim">
            No scopes yet — the registry holds no packages, and no access
            rules have been written.
          </p>
        ) : (
          scopes.map((scope) => (
            <div key={scope.scope} className="p-4">
              <Switch
                label={scope.scope}
                description={
                  (scope.anonymousRead
                    ? 'Open — readable without a token'
                    : 'Closed — a token is needed even to read') +
                  (scope.published ? ' · packages published' : ' · no packages yet')
                }
                checked={scope.anonymousRead}
                disabled={pending}
                onChange={(next) => toggle(scope.scope, next)}
              />
            </div>
          ))
        )}
        {error ? (
          <p className="border-t border-rail p-4 text-xs leading-relaxed text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
