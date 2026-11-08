'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';

import {
  connectDnsProviderAction,
  disconnectDnsProviderAction,
} from '@/app/(project)/projects/[projectId]/domains/actions';

/**
 * The account that holds the domain.
 *
 * Connecting it lets the platform write the DNS records itself — the
 * person never copies a record into a registrar by hand.
 *
 * The token is checked before it is kept: a token that cannot read the
 * zones is refused, so the connection never pretends to be able to do
 * something it cannot.
 */
export function DnsConnectionCard({
  projectId,
  connection,
}: {
  projectId: string;
  connection: {
    provider: string;
    email: string | null;
    lastVerifiedAt: string | null;
  } | null;
}) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const disconnect = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await disconnectDnsProviderAction(projectId);
      if (result.error) setError(result.error);
      else setNotice('The account is disconnected. The token went with it.');
    });
  };

  const connect = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await connectDnsProviderAction(projectId, token);
      if (result.error) {
        setError(result.error);
        return;
      }
      setToken('');
      setNotice(
        result.email
          ? `${result.email} is connected. The platform can write DNS for the domains in it.`
          : 'The account is connected. The platform can write DNS for the domains in it.',
      );
    });
  };

  if (connection) {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              Your DNS account is connected
            </p>
            <p className="mt-0.5 text-xs text-text-dim">
              {connection.email ?? connection.provider} ·{' '}
              {connection.lastVerifiedAt
                ? `checked ${new Date(connection.lastVerifiedAt).toLocaleDateString()}`
                : 'not checked yet'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="success">connected</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnect}
              loading={pending}
            >
              Disconnect
            </Button>
          </div>
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

  return (
    <Card className="p-4">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-text">
          Connect your DNS account
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          With the account connected, the platform writes the records for you —
          it finds the domain in your account, creates the records, and checks
          them afterwards. Without it, the records are listed below and you set
          them yourself.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-text-dim">
          <li>
            · The token needs{' '}
            <strong className="font-medium text-text-muted">Zone:Read</strong>{' '}
            and{' '}
            <strong className="font-medium text-text-muted">DNS:Edit</strong>{' '}
            for the zone.
          </li>
          <li>
            · It is stored encrypted, and it is only used for this
            project&apos;s domains.
          </li>
          <li>
            ·{' '}
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Make a token at Cloudflare
            </a>
            .
          </li>
        </ul>
      </div>

      <div className="mt-4 max-w-xl space-y-3">
        <Input
          label="Cloudflare API token"
          type="password"
          placeholder="Your API token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
        />
        {error ? <ErrorState message={error} /> : null}
        {notice ? <p className="text-xs text-success">{notice}</p> : null}
        <Button
          variant="primary"
          onClick={connect}
          loading={pending}
          disabled={!token.trim()}
        >
          Connect the account
        </Button>
      </div>
    </Card>
  );
}
