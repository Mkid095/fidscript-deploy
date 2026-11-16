'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';

import {
  connectWhatsappAction,
  disconnectWhatsappAction,
  provisionWhatsappIdentityAction,
} from '@/app/(project)/projects/[projectId]/whatsapp/actions';
import type { WhatsappState } from '@/lib/api/whatsapp';

/**
 * The project's WhatsApp.
 *
 * The messaging is the WhatsApp platform's — this is the project's door to
 * it. The key is held by the platform, encrypted, and is used for nothing
 * else.
 */
export function WhatsappPanel({
  projectId,
  state,
  consoleUrl,
}: {
  projectId: string;
  state: WhatsappState | null;
  consoleUrl: string | null;
}) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connect = () => {
    setError(null);
    startTransition(async () => {
      const result = await connectWhatsappAction(projectId, apiKey.trim());
      if (result.error) setError(result.error);
      else setApiKey('');
    });
  };

  const disconnect = () => {
    setError(null);
    startTransition(async () => {
      const result = await disconnectWhatsappAction(projectId);
      if (result.error) setError(result.error);
    });
  };

  const provisionIdentity = () => {
    setError(null);
    startTransition(async () => {
      const result = await provisionWhatsappIdentityAction(projectId);
      if (result.error) setError(result.error);
    });
  };

  if (!state || !state.connected) {
    return (
      <Card className="p-4">
        <div className="max-w-xl space-y-3">
          <p className="text-sm text-text-muted">
            The messaging itself lives in the WhatsApp platform. It is created
            with the project — an instance of its own, waiting for pairing. When
            that attempt failed, this is the way back; the pasted key below is
            the other way, for a key that is not the platform&apos;s.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={provisionIdentity}
              loading={pending}
            >
              Create the project&apos;s instance
            </Button>
            {consoleUrl ? (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline"
              >
                The WhatsApp console
              </a>
            ) : null}
          </div>
          <Input
            label="The WhatsApp API key"
            type="password"
            placeholder="The key from your WhatsApp account"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
            hint="It is kept by the platform, encrypted, and is used for nothing else."
          />
          {state?.error ? <ErrorState message={state.error} /> : null}
          {error ? <ErrorState message={error} /> : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={connect}
            loading={pending}
            disabled={!apiKey.trim()}
          >
            Connect it with a key instead
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              {state.instance ? state.instance.name : 'Connected'}
            </p>
            <p className="mt-0.5 text-xs text-text-dim">
              {state.instance
                ? `${state.instance.status}${state.instance.number ? ` · ${state.instance.number}` : ''}`
                : 'No instance has been chosen yet.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={state.reachable ? 'success' : 'warning'}>
              {state.reachable ? 'connected' : 'not answering'}
            </Badge>
            {!state.instance ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={provisionIdentity}
                loading={pending}
              >
                Create the project&apos;s instance
              </Button>
            ) : null}
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
        {state.error ? (
          <div className="mt-3">
            <ErrorState message={state.error} />
          </div>
        ) : null}
      </Card>

      <section>
        <Card>
          {state.instances.length === 0 ? (
            <EmptyState
              title="No instances"
              body="The key sees no instances. Make one in the WhatsApp console, and it appears here."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {state.instances.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{entry.name}</p>
                    <p className="truncate text-xs text-text-dim">
                      {entry.number ?? 'no number yet'}
                    </p>
                  </div>
                  <Badge
                    tone={entry.status === 'connected' ? 'success' : 'warning'}
                  >
                    {entry.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
