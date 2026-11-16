'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';

import {
  createApiKeyAction,
  revokeApiKeyAction,
} from '@/app/(platform)/settings/actions';

/**
 * The keys that act as you.
 *
 * A key is shown once, when it is made — the platform keeps only its hash,
 * so it cannot be shown again.
 */
export function ApiKeysPanel({
  keys,
}: {
  keys: Array<{
    id: string;
    name: string;
    permissions: string[];
    lastUsedAt: string | null;
    createdAt: string;
  }>;
}) {
  const [name, setName] = useState('');
  const [made, setMade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    setMade(null);
    startTransition(async () => {
      const result = await createApiKeyAction(name.trim());
      if (result.error) setError(result.error);
      else {
        setMade(result.key ?? null);
        setName('');
      }
    });
  };

  const revoke = (keyId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokeApiKeyAction(keyId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        {keys.length === 0 ? (
          <EmptyState
            title="No keys yet"
            body="A key acts as you, from a script, a CLI or an agent."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{key.name}</p>
                  <p className="truncate text-xs text-text-dim">
                    {key.permissions.length > 0
                      ? key.permissions.join(', ')
                      : 'No scopes'}{' '}
                    ·{' '}
                    {key.lastUsedAt
                      ? `used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : 'never used'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={key.lastUsedAt ? 'neutral' : 'neutral'}>
                    {key.lastUsedAt ? 'in use' : 'unused'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(key.id)}
                    loading={pending}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="max-w-sm space-y-3 p-4">
          <Input
            label="Name"
            hint="What the key is for — 'the website', 'the nightly job'."
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="The website"
          />
          {error ? <ErrorState message={error} /> : null}
          {made ? (
            <div className="rounded-md border border-success/40 bg-success/5 p-3">
              <p className="text-xs font-medium text-success">
                The key is shown once. Copy it now.
              </p>
              <p className="mt-1 break-all font-mono text-xs text-text">
                {made}
              </p>
            </div>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={create}
            loading={pending}
            disabled={!name.trim()}
          >
            Make a key
          </Button>
        </div>
      </Card>
    </div>
  );
}
