'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/feedback';
import { Dialog } from '@/components/ui/dialog';
import { CodeBlock } from '@/components/ui/code-block';

import {
  createEmailKeyAction,
  deleteEmailKeyAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * The keys that send mail.
 *
 * A key is shown once, when it is made — the platform keeps only its hash,
 * so it cannot be shown again. The show-once panel is a dialog: it stands
 * over the page, and the key is copied from there.
 */
export function EmailKeysSection({
  projectId,
  keys,
}: {
  projectId: string;
  keys: Array<{ id: string; name: string; createdAt: string }>;
}) {
  const [name, setName] = useState('');
  const [made, setMade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    setMade(null);
    startTransition(async () => {
      const result = await createEmailKeyAction(projectId, name.trim());
      if (result.error) setError(result.error);
      else {
        setMade(result.key ?? null);
        setName('');
      }
    });
  };

  const remove = (keyId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteEmailKeyAction(projectId, keyId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        {keys.length === 0 ? (
          <EmptyState
            title="No key yet"
            body="A key sends mail on this project's behalf, from a script or an application."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{key.name}</p>
                  <p className="text-xs text-text-dim">
                    made {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(key.id)}
                  loading={pending}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="max-w-xl space-y-4 p-4">
          <Input
            label="Name"
            hint="What the key is for — 'the website', 'the nightly report'."
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="The website"
          />

          {error ? <ErrorState message={error} /> : null}

          <Button
            variant="primary"
            onClick={create}
            loading={pending}
            disabled={!name.trim()}
          >
            Make a key
          </Button>
        </div>
      </Card>

      <Dialog
        open={made !== null}
        onClose={() => setMade(null)}
        title="Copy your key now"
        description="It is shown once and cannot be recovered. Store it somewhere safe."
        footer={
          <Button variant="primary" onClick={() => setMade(null)}>
            I have saved it
          </Button>
        }
      >
        {made !== null ? <CodeBlock code={made} label="The key" /> : null}
      </Dialog>
    </div>
  );
}
