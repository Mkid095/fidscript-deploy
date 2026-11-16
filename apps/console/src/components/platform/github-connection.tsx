'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';

import {
  connectGithubAction,
  disconnectGithubAction,
} from '@/app/(platform)/settings/actions';

/**
 * The GitHub account.
 *
 * Connected once, kept by the platform, and used by every deployment after
 * that — so the person is not asked for the same token twice.
 *
 * The token is a credential: it is stored encrypted and it is never shown
 * again.
 */
export function GithubConnection({
  connected,
  username,
  avatarUrl,
  scopes,
}: {
  connected: boolean;
  username?: string;
  avatarUrl?: string | null;
  scopes?: string[];
}) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connect = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await connectGithubAction(token.trim());
      if (result.error) setError(result.error);
      else {
        setToken('');
        setNotice(
          'The account is connected. It is used by every deployment you make.',
        );
      }
    });
  };

  const disconnect = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await disconnectGithubAction();
      if (result.error) setError(result.error);
      else setNotice('The account is disconnected. The token is gone.');
    });
  };

  if (connected) {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-9 rounded-full" />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {username ?? 'A GitHub account'}
              </p>
              <p className="truncate text-xs text-text-dim">
                {scopes && scopes.length > 0
                  ? `${scopes.length} permission${scopes.length === 1 ? '' : 's'}`
                  : 'Connected — used by every deployment you make'}
              </p>
            </div>
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
        {notice ? <p className="mt-3 text-xs text-success">{notice}</p> : null}
        {error ? (
          <div className="mt-3">
            <ErrorState message={error} />
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="max-w-xl space-y-3">
        <p className="text-sm text-text-muted">
          Connect the GitHub account your code lives in. The platform keeps the
          token — encrypted, and never shown again — and uses it to read the
          repositories you may deploy, and to register the webhook that deploys
          on a push.
        </p>
        <Input
          label="A personal access token"
          type="password"
          placeholder="ghp_…"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          hint="It needs the repository scope. A fine-grained token works too."
        />
        {error ? <ErrorState message={error} /> : null}
        {notice ? <p className="text-xs text-success">{notice}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={connect}
            loading={pending}
            disabled={!token.trim()}
          >
            Connect the account
          </Button>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            Make a token at GitHub
          </a>
        </div>
      </div>
    </Card>
  );
}
