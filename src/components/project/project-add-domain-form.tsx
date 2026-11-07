'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { addDomainAction } from '@/app/(project)/projects/[projectId]/domains/actions';

/**
 * Adding a domain.
 *
 * The domain is added to the project; the DNS records that have to be set
 * at the registrar come back from the platform.
 */
export function ProjectAddDomainForm({ projectId }: { projectId: string }) {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('DEPLOYMENT');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    setAdded(null);
    startTransition(async () => {
      const result = await addDomainAction(projectId, { domain, type: [type] });
      if (result.error) setError(result.error);
      else {
        setAdded(domain.trim().toLowerCase());
        setDomain('');
      }
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          label="Domain"
          placeholder="store.example.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        />
        <Select
          label="Purpose"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: 'DEPLOYMENT', label: 'Deployments' },
            { value: 'EMAIL', label: 'Email' },
            { value: 'INBOUND_EMAIL', label: 'Inbound email' },
            { value: 'API', label: 'API' },
            { value: 'REDIRECT', label: 'Redirect' },
          ]}
          className="sm:w-44"
        />
      </div>

      <Button variant="primary" onClick={add} loading={pending} disabled={!domain.trim()}>
        Add the domain
      </Button>

      {error ? <ErrorState message={error} /> : null}

      {added ? (
        <div className="rounded-md border border-success/40 bg-success/5 p-3">
          <p className="text-xs font-medium text-success">{added} was added.</p>
          <p className="mt-1 text-xs text-text-muted">
            Now point it at the platform — the records are in the list beside it.
          </p>
        </div>
      ) : null}
    </div>
  );
}
