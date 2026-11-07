'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { createMailboxAction } from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * Making a mailbox.
 *
 * The password is set here and never shown again — the platform keeps only
 * its hash, so this is the one time it is said out loud.
 */
export function EmailMailboxForm({ projectId, domains }: { projectId: string; domains: string[] }) {
  const [domain, setDomain] = useState(domains[0] ?? '');
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createMailboxAction(projectId, {
        domain,
        localPart: localPart.trim(),
        password,
      });
      if (result.error) setError(result.error);
      else {
        setLocalPart('');
        setPassword('');
      }
    });
  };

  if (domains.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-text-muted">
        A mailbox belongs to a domain. Add the domain first.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Input
        label="Domain"
        value={domain}
        onChange={(event) => setDomain(event.target.value)}
      />
      <Input
        label="Name"
        hint="The part before the @."
        value={localPart}
        onChange={(event) => setLocalPart(event.target.value)}
        placeholder="support"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint="Shown once, and never again."
      />

      {error ? <ErrorState message={error} /> : null}

      <Button
        variant="primary"
        onClick={create}
        loading={pending}
        disabled={!domain || !localPart.trim() || password.length < 8}
      >
        Create the mailbox
      </Button>
    </div>
  );
}
