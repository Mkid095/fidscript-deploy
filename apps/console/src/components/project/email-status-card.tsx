'use client';

import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { EmailStatus } from '@/lib/api/email';

import { setupEmailAction } from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * How the mail of this project stands.
 *
 * Each record is one thing that has to be true before a message leaves. What
 * the platform has not confirmed still says "pending" — it never claims a
 * record it has not checked. The one click at the top writes all four
 * through the project's own DNS connection, in the name the project already
 * answers on.
 */
export function EmailStatusCard({
  status,
  projectId,
}: {
  status: EmailStatus | null;
  projectId: string;
}) {
  const toast = useToast();
  const [working, setWorking] = useState(false);

  if (!status) {
    return (
      <Card className="p-4">
        <p className="text-sm text-text-muted">
          The platform did not answer with the state of the mail.
        </p>
      </Card>
    );
  }

  const nothingVerified =
    !status.mx.verified &&
    !status.spf.verified &&
    !status.dkim.verified &&
    !status.dmarc.verified;

  const setUp = async () => {
    setWorking(true);
    const result = await setupEmailAction(projectId);
    setWorking(false);
    if (result.error) toast.error(result.error);
    else if (result.status === 'ACTIVE')
      toast.success('The mail records are set and confirmed.');
    else toast.info('The records were written. They confirm as they spread.');
  };

  return (
    <Card>
      {status.cloudflare.connected && nothingVerified ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rail px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-text">
              {status.domain
                ? `Set the mail up on ${status.domain}`
                : 'Set the mail up'}
            </p>
            <p className="mt-0.5 text-xs text-text-dim">
              One click writes the MX, SPF, DKIM and DMARC records for the
              project&apos;s own name.
            </p>
          </div>
          <Button onClick={setUp} disabled={working} size="sm">
            {working ? 'Working…' : 'Set up'}
          </Button>
        </div>
      ) : null}

      <div className="divide-y divide-rail">
        <Row
          term="MX"
          detail={status.mx.host ?? 'the mail exchanger'}
          state={status.mx.verified}
        />
        <Row
          term="SPF"
          detail="the sender policy"
          state={status.spf.verified}
        />
        <Row
          term="DKIM"
          detail="the signing key"
          state={status.dkim.verified}
        />
        <Row
          term="DMARC"
          detail="the reporting policy"
          state={status.dmarc.verified}
        />
        <Row
          term="Cloudflare"
          detail={
            status.cloudflare.connected
              ? 'connected — the records can be fixed for you'
              : 'not connected'
          }
          state={status.cloudflare.connected}
          neutral
        />
      </div>
    </Card>
  );
}

function Row({
  term,
  detail,
  state,
  neutral = false,
}: {
  term: string;
  detail: string;
  state: boolean;
  neutral?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-text">{term}</p>
        <p className="truncate text-xs text-text-dim">{detail}</p>
      </div>
      <Badge tone={neutral ? 'neutral' : state ? 'success' : 'warning'}>
        {neutral
          ? state
            ? 'connected'
            : 'not connected'
          : state
            ? 'verified'
            : 'pending'}
      </Badge>
    </div>
  );
}
