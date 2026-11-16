'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import type { EmailCatchAll, EmailDomain, EmailMailbox } from '@/lib/api/email';

import {
  createWebhookAction,
  deleteWebhookAction,
  setCatchAllAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

const EVENTS = [
  'message.received',
  'message.delivered',
  'message.bounced',
  'message.opened',
  'message.clicked',
];

/**
 * Where the mail goes when it arrives.
 *
 * The catch-all is the address nobody wrote to: where does that mail land?
 * And the webhooks are the places the mail's own story is told — received,
 * delivered, bounced.
 */
export function EmailInboundPanel({
  projectId,
  domains,
  mailboxes,
  webhooks,
  catchAll,
}: {
  projectId: string;
  domains: EmailDomain[];
  mailboxes: EmailMailbox[];
  webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    isActive?: boolean;
  }>;
  catchAll: EmailCatchAll | null;
}) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['message.received']);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '');
  const [target, setTarget] = useState('mailbox');
  const [targetValue, setTargetValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addWebhook = () => {
    setError(null);
    startTransition(async () => {
      const result = await createWebhookAction(projectId, url.trim(), events);
      if (result.error) setError(result.error);
      else {
        setUrl('');
        setEvents(['message.received']);
      }
    });
  };

  const removeWebhook = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteWebhookAction(projectId, id);
      if (result.error) setError(result.error);
    });
  };

  const setCatchAll = () => {
    setError(null);
    if (!domainId) return;
    startTransition(async () => {
      const result = await setCatchAllAction(projectId, domainId, {
        targetType: target as 'mailbox' | 'external' | 'webhook',
        ...(target === 'mailbox' ? { targetId: targetValue } : {}),
        ...(target === 'external' ? { targetAddress: targetValue } : {}),
        ...(target === 'webhook' ? { webhookUrl: targetValue } : {}),
      });
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {domains.length > 0 ? (
        <Card>
          <div className="space-y-4 p-4">
            <p className="text-sm font-medium text-text">The catch-all</p>
            <p className="text-xs leading-relaxed text-text-muted">
              The mail that arrives for an address nobody wrote to. It goes to
              one place — a mailbox, an address of your own, or a webhook.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="The domain"
                value={domainId}
                onChange={(event) => setDomainId(event.target.value)}
                options={domains.map((domain) => ({
                  value: domain.id,
                  label: domain.domain,
                }))}
              />
              <Select
                label="Where it goes"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                options={[
                  { value: 'mailbox', label: 'A mailbox of this project' },
                  { value: 'external', label: 'An address of your own' },
                  { value: 'webhook', label: 'A webhook' },
                ]}
              />
            </div>

            {target === 'mailbox' ? (
              <Select
                label="The mailbox"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                options={[
                  { value: '', label: 'Choose a mailbox…' },
                  ...mailboxes.map((mailbox) => ({
                    value: mailbox.id,
                    label: mailbox.localPart,
                  })),
                ]}
              />
            ) : (
              <Input
                label={
                  target === 'external' ? 'The address' : 'The webhook URL'
                }
                type={target === 'external' ? 'email' : 'url'}
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                placeholder={
                  target === 'external'
                    ? 'you@example.com'
                    : 'https://hooks.example.com/…'
                }
              />
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={setCatchAll}
              loading={pending}
              disabled={!domainId || !targetValue}
            >
              Set it
            </Button>

            {catchAll ? (
              <p className="text-xs text-text-dim">
                Currently sending unmatched mail to{' '}
                <span className="font-mono text-text">
                  {catchAllTarget(catchAll, mailboxes)}
                </span>
                .
              </p>
            ) : (
              <p className="text-xs text-text-dim">
                No rule yet — unmatched mail is not delivered anywhere.
              </p>
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-rail px-4 py-3">
          <p className="text-sm font-medium text-text">The webhooks</p>
          <span className="text-xs text-text-dim">{webhooks.length}</span>
        </div>

        {webhooks.length === 0 ? (
          <EmptyState
            title="No webhooks"
            body="A webhook is told when mail arrives, when it is delivered, and when it bounces."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {webhooks.map((webhook) => (
              <li
                key={webhook.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-text">
                    {webhook.url}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-dim">
                    {webhook.events.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={webhook.isActive === false ? 'neutral' : 'success'}
                  >
                    {webhook.isActive === false ? 'paused' : 'on'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWebhook(webhook.id)}
                    loading={pending}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="max-w-xl space-y-4 border-t border-rail p-4">
          <Input
            label="The webhook URL"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://hooks.example.com/…"
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-text-muted">
              What it is told
            </legend>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((event) => {
                const on = events.includes(event);
                return (
                  <button
                    key={event}
                    type="button"
                    onClick={() =>
                      setEvents(
                        on
                          ? events.filter((entry) => entry !== event)
                          : [...events, event],
                      )
                    }
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      on
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-rail text-text-dim hover:text-text'
                    }`}
                  >
                    {event}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? <ErrorState message={error} /> : null}

          <Button
            variant="primary"
            size="sm"
            onClick={addWebhook}
            loading={pending}
            disabled={!url.trim() || events.length === 0}
          >
            Add the webhook
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * What the catch-all sends to, said in the person's words.
 */
function catchAllTarget(
  rule: EmailCatchAll,
  mailboxes: EmailMailbox[],
): string {
  switch (rule.target.type) {
    case 'mailbox': {
      const mailbox = mailboxes.find((entry) => entry.id === rule.target.mailboxId);
      return mailbox ? mailbox.localPart : 'a mailbox of this project';
    }
    case 'external':
      return rule.target.address ?? 'an address of your own';
    case 'webhook':
      return rule.target.url ?? 'a webhook';
    default:
      return 'one place';
  }
}
