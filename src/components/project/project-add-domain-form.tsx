'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { addDomainAction } from '@/app/(project)/projects/[projectId]/domains/actions';

/**
 * Adding a domain.
 *
 * The question is not "what is the domain" — it is **who points it at the
 * platform**. Either the connected account does, or the person does, by
 * hand, from the records the platform shows.
 */
export function ProjectAddDomainForm({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('DEPLOYMENT');
  const [mode, setMode] = useState<'auto' | 'manual'>(canWrite ? 'auto' : 'manual');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    setAdded(null);
    startTransition(async () => {
      const result = await addDomainAction(projectId, {
        domain,
        type: [type],
        mode,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAdded(domain.trim().toLowerCase());
      setDomain('');
    });
  };

  return (
    <div className="max-w-xl space-y-4 p-4">
      <Input
        label="Domain"
        placeholder="store.example.com"
        value={domain}
        onChange={(event) => setDomain(event.target.value)}
        hint="The domain the project answers on."
      />

      <Select
        label="What it is for"
        value={type}
        onChange={(event) => setType(event.target.value)}
        options={[
          { value: 'DEPLOYMENT', label: 'Deployments' },
          { value: 'EMAIL', label: 'Email' },
          { value: 'INBOUND_EMAIL', label: 'Inbound email' },
          { value: 'API', label: 'API' },
          { value: 'REDIRECT', label: 'Redirect' },
        ]}
      />

      {canWrite ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-text-muted">Who points it at the platform</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rail bg-surface-2 p-3">
            <input
              type="radio"
              name="mode"
              className="mt-0.5 size-3.5 accent-[var(--accent)]"
              checked={mode === 'auto'}
              onChange={() => setMode('auto')}
            />
            <span>
              <span className="block text-sm text-text">The platform writes the records</span>
              <span className="mt-0.5 block text-xs text-text-dim">
                Your connected account is used. The domain must be in it.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rail bg-surface-2 p-3">
            <input
              type="radio"
              name="mode"
              className="mt-0.5 size-3.5 accent-[var(--accent)]"
              checked={mode === 'manual'}
              onChange={() => setMode('manual')}
            />
            <span>
              <span className="block text-sm text-text">I will set the records</span>
              <span className="mt-0.5 block text-xs text-text-dim">
                The records are shown, and you copy them into your registrar.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      {added ? (
        <div className="rounded-md border border-success/40 bg-success/5 p-3">
          <p className="text-xs font-medium text-success">{added} was added.</p>
          <p className="mt-1 text-xs text-text-muted">
            {mode === 'auto'
              ? 'The platform is writing its records now — check the status in a moment.'
              : 'Now set the records it shows, and then check them.'}
          </p>
        </div>
      ) : null}

      <Button variant="primary" onClick={add} loading={pending} disabled={!domain.trim()}>
        Add the domain
      </Button>
    </div>
  );
}
