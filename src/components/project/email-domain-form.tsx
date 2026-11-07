'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import {
  addEmailDomainAction,
  verifyEmailDomainAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * Adding a mail domain.
 *
 * The platform answers with the records that have to be set — the TXT that
 * proves ownership, the MX that routes the mail — and the console shows
 * them, because a domain that is added and never pointed at anything
 * receives nothing.
 */
export function EmailDomainForm({
  projectId,
  domainId,
}: {
  projectId: string;
  domainId?: string;
}) {
  const [domain, setDomain] = useState('');
  const [steps, setSteps] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    setSteps(null);
    startTransition(async () => {
      const result = await addEmailDomainAction(projectId, domain);
      if (result.error) setError(result.error);
      else {
        setSteps(result.steps ?? []);
        setDomain('');
      }
    });
  };

  const verify = () => {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailDomainAction(projectId, domainId ?? '');
      if (result.error) setError(result.error);
      else setSteps(null);
    });
  };

  return (
    <div className="space-y-4 p-4">
      <Input
        label="Domain"
        placeholder="store.example.com"
        value={domain}
        onChange={(event) => setDomain(event.target.value)}
        hint="The domain the mail will be sent and received for."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={add} loading={pending} disabled={!domain.trim()}>
          Add the domain
        </Button>
        {domainId ? (
          <Button variant="outline" onClick={verify} loading={pending}>
            Check the records
          </Button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {steps && steps.length > 0 ? (
        <div className="rounded-md border border-rail bg-surface-2 p-3">
          <p className="text-xs font-medium text-text-muted">
            Set these at your registrar, then check the records:
          </p>
          <ul className="mt-2 space-y-1">
            {steps.map((step, index) => (
              <li key={index} className="font-mono text-xs text-text">
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
