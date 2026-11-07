'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';
import type { DnsRecord } from '@/lib/api/domains';

import {
  autoConfigureDnsAction,
  verifyDomainAction,
} from '@/app/(project)/projects/[projectId]/domains/actions';

/**
 * One domain, and the records that point it at the platform.
 *
 * Each record says whether it is right. When the account that holds the
 * domain is connected, the platform can write them — one button, and it
 * says what it did.
 */
export function DomainCard({
  projectId,
  domainId,
  domain,
  status,
  records,
  canWrite,
}: {
  projectId: string;
  domainId: string;
  domain: string;
  status: string;
  records: DnsRecord[];
  canWrite: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<{ ok?: boolean; error?: string }>,
    message: string,
  ) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else setNotice(message);
    });
  };

  const deployment = records.filter((record) => record.category === 'deployment');
  const verification = records.filter((record) => record.category === 'verification');
  const shown = [...deployment, ...verification];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{domain}</p>
          <p className="mt-0.5 text-xs text-text-dim">
            {status === 'ACTIVE' ? 'It answers.' : 'It is not answering yet.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status === 'ACTIVE' ? 'success' : 'warning'}>{status.toLowerCase()}</Badge>
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-text-muted">
            {canWrite
              ? 'These records point the domain at the platform:'
              : 'Set these at your registrar:'}
          </p>
          <ul className="mt-2 space-y-1.5">
            {shown.map((record, index) => (
              <li
                key={`${record.type}-${record.name}-${index}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2"
              >
                <span className="w-12 shrink-0 font-mono text-xs font-medium text-accent">
                  {record.type}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text">
                  {record.name}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
                  {record.value || '—'}
                </span>
                <Badge
                  tone={
                    record.status === 'ok'
                      ? 'success'
                      : record.status === 'missing'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {record.status === 'ok' ? 'right' : record.status === 'missing' ? 'wrong' : 'pending'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canWrite ? (
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() =>
              run(
                () => autoConfigureDnsAction(projectId, domainId),
                'The records were written. They take a moment to spread.',
              )
            }
          >
            Write the records
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={() =>
            run(
              () => verifyDomainAction(projectId, domainId),
              'The records were checked.',
            )
          }
        >
          Check the records
        </Button>
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorState message={error} />
        </div>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-success">{notice}</p> : null}
    </Card>
  );
}
