'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import type { NotificationChannel } from '@/lib/api/monitoring';

import {
  createNotificationChannelAction,
  deleteNotificationChannelAction,
} from '@/app/(project)/projects/[projectId]/monitoring/actions';

/**
 * Where the word goes.
 *
 * An email address, a Slack webhook or any URL — the places this project's
 * alerts are sent to.
 */
export function NotificationChannelsPanel({
  projectId,
  channels,
}: {
  projectId: string;
  channels: NotificationChannel[];
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'email' | 'slack' | 'webhook'>('email');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      const config: Record<string, string> =
        type === 'email'
          ? { email: target.trim() }
          : type === 'slack'
            ? { webhookUrl: target.trim() }
            : { url: target.trim() };

      const result = await createNotificationChannelAction(projectId, {
        name: name.trim(),
        type,
        config,
      });
      if (result.error) setError(result.error);
      else {
        setName('');
        setTarget('');
      }
    });
  };

  const remove = (channelId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteNotificationChannelAction(
        projectId,
        channelId,
      );
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <Card>
        {channels.length === 0 ? (
          <EmptyState
            title="Nowhere yet"
            body="An email address, a Slack webhook, or any URL — the places this project's alerts go."
          />
        ) : (
          <ul className="divide-y divide-rail">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{channel.name}</p>
                  <p className="truncate text-xs text-text-dim">
                    {Object.values(channel.config ?? {})[0] ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{channel.type}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(channel.id)}
                    loading={pending}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="max-w-xl space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="The team"
            />
            <Select
              label="Kind"
              value={type}
              onChange={(event) =>
                setType(event.target.value as 'email' | 'slack' | 'webhook')
              }
              options={[
                { value: 'email', label: 'Email' },
                { value: 'slack', label: 'Slack' },
                { value: 'webhook', label: 'Webhook' },
              ]}
            />
          </div>

          <Input
            label={type === 'email' ? 'Email address' : 'The URL'}
            type={type === 'email' ? 'email' : 'url'}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder={
              type === 'email'
                ? 'team@example.com'
                : 'https://hooks.example.com/…'
            }
          />

          {error ? <ErrorState message={error} /> : null}

          <Button
            variant="primary"
            size="sm"
            onClick={create}
            loading={pending}
            disabled={!name.trim() || !target.trim()}
          >
            Add the channel
          </Button>
        </div>
      </Card>
    </div>
  );
}
