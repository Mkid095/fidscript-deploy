'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/feedback';
import type { EmailAlias } from '@/lib/api/email';

import {
  createAliasAction,
  deleteAliasAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * The aliases.
 *
 * An alias is an address that forwards somewhere else — to a mailbox, to
 * another address, or to a webhook.
 */
export function EmailAliasesSection({
  projectId,
  aliases,
  domains,
}: {
  projectId: string;
  aliases: Array<EmailAlias & { domain?: string }>;
  domains: string[];
}) {
  const [domain, setDomain] = useState(domains[0] ?? '');
  const [localPart, setLocalPart] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createAliasAction(projectId, {
        domain,
        localPart: localPart.trim(),
        destination: destination.trim(),
      });
      if (result.error) setError(result.error);
      else {
        setLocalPart('');
        setDestination('');
      }
    });
  };

  const remove = (aliasId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteAliasAction(projectId, aliasId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        {aliases.length === 0 ? (
          <EmptyState
            title="No alias yet"
            body="An alias is an address that forwards somewhere else — to a mailbox, or to another address. It has no password of its own; make a mailbox for an address that can be signed into."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {aliases.map((alias) => (
              <li
                key={alias.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">
                    {alias.localPart}
                    {alias.domain ? `@${alias.domain}` : ''}
                  </p>
                  <p className="truncate text-xs text-text-dim">
                    → {alias.destination}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(alias.id)}
                  loading={pending}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {domains.length > 0 ? (
        <Card>
          <div className="max-w-xl space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                options={domains.map((name) => ({ value: name, label: name }))}
              />
              <Input
                label="Name"
                hint="The part before the @."
                value={localPart}
                onChange={(event) => setLocalPart(event.target.value)}
                placeholder="hello"
              />
            </div>
            <Input
              label="Forwards to"
              placeholder="support@example.com"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
            <p className="text-xs text-text-dim">
              An alias only forwards — it has no password. For an address that
              can be signed into (with credentials and a webmail link), make a
              mailbox instead.
            </p>

            {error ? <ErrorState message={error} /> : null}

            <Button
              variant="primary"
              onClick={create}
              loading={pending}
              disabled={!domain || !localPart.trim() || !destination.trim()}
            >
              Create the alias
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
