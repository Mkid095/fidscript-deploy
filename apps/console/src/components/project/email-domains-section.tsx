'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import type { EmailDomain } from '@/lib/api/email';

import {
  addEmailDomainAction,
  verifyEmailDomainAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * The domains the mail is for.
 *
 * A domain is proved with a TXT record and then given four more — MX,
 * SPF, DKIM and DMARC. Every one of them says whether it is right, and the
 * whole set can be written by the account that holds the domain.
 */
export function EmailDomainsSection({
  projectId,
  domains,
  canWriteDns,
}: {
  projectId: string;
  domains: EmailDomain[];
  canWriteDns: boolean;
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

  const check = (domainId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await verifyEmailDomainAction(projectId, domainId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {domains.length === 0 ? (
        <Card>
          <EmptyState
            title="No mail domain yet"
            body="A mail domain is the address your mail comes from and goes to. It needs four DNS records before a message can leave."
          />
        </Card>
      ) : (
        domains.map((entry) => (
          <Card key={entry.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {entry.domain}
                </p>
                <p className="mt-0.5 text-xs text-text-dim">
                  {entry.status === 'ACTIVE'
                    ? 'It sends and receives.'
                    : entry.status === 'PENDING'
                      ? 'Waiting for the records.'
                      : entry.status.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Record ok={entry.mxVerified} label="MX" />
                  <Record ok={entry.spfVerified} label="SPF" />
                  <Record ok={entry.dkimVerified} label="DKIM" />
                  <Record ok={entry.dmarcVerified} label="DMARC" />
                </div>
                <Badge tone={entry.status === 'ACTIVE' ? 'success' : 'warning'}>
                  {entry.status.toLowerCase()}
                </Badge>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => check(entry.id)}
              >
                Check the records
              </Button>
              {canWriteDns ? (
                <span className="text-xs text-text-dim">
                  The records can be written from your connected DNS account.
                </span>
              ) : (
                <Link
                  href={`/projects/${projectId}/domains`}
                  className="text-xs text-accent hover:underline"
                >
                  Connect your DNS account, and the platform writes them for you
                </Link>
              )}
            </div>
          </Card>
        ))
      )}

      <Card>
        <div className="max-w-xl space-y-4 p-4">
          <Input
            label="Add a mail domain"
            placeholder="store.example.com"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            hint="The domain the mail will be sent and received for."
          />

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

          <Button
            variant="primary"
            onClick={add}
            loading={pending}
            disabled={!domain.trim()}
          >
            Add the domain
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Record({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${
        ok ? 'border-success/40 text-success' : 'border-rail text-text-dim'
      }`}
    >
      {label} {ok ? '✓' : '—'}
    </span>
  );
}
