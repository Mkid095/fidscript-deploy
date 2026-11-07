'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import type { EmailMailbox } from '@/lib/api/email';

import {
  createMailboxAction,
  deleteMailboxAction,
  resetMailboxPasswordAction,
} from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * The mailboxes.
 *
 * A mailbox is an address the mail arrives at, and a place it is read. Its
 * password is set once and never shown again — the platform keeps only the
 * hash.
 */
export function EmailMailboxesSection({
  projectId,
  mailboxes,
  domains,
}: {
  projectId: string;
  mailboxes: Array<EmailMailbox & { domain?: string }>;
  domains: string[];
}) {
  const [domain, setDomain] = useState(domains[0] ?? '');
  const [localPart, setLocalPart] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createMailboxAction(projectId, {
        domain,
        localPart: localPart.trim(),
        password,
      });
      if (result.error) setError(result.error);
      else {
        setLocalPart('');
        setPassword('');
      }
    });
  };

  const resetPassword = (mailboxId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await resetMailboxPasswordAction(projectId, mailboxId, newPassword);
      if (result.error) setError(result.error);
      else {
        setResetting(null);
        setNewPassword('');
      }
    });
  };

  const remove = (mailboxId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteMailboxAction(projectId, mailboxId);
      if (result.error) setError(result.error);
    });
  };

  if (domains.length === 0) {
    return (
      <Card>
        <EmptyState
          title="A mailbox belongs to a domain"
          body="Add the mail domain first, and the mailboxes can be made under it."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        {mailboxes.length === 0 ? (
          <EmptyState title="No mailbox yet" body="A mailbox is an address the mail arrives at." />
        ) : (
          <ul className="divide-y divide-rail">
            {mailboxes.map((mailbox) => (
              <li key={mailbox.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                      {mailbox.localPart}
                      {mailbox.domain ? `@${mailbox.domain}` : ''}
                    </p>
                    {mailbox.name ? (
                      <p className="truncate text-xs text-text-dim">{mailbox.name}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={mailbox.isActive ? 'success' : 'neutral'}>
                      {mailbox.isActive ? 'active' : 'suspended'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetting(resetting === mailbox.id ? null : mailbox.id)}
                    >
                      New password
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(mailbox.id)}
                      loading={pending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {resetting === mailbox.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Input
                      label="New password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => resetPassword(mailbox.id)}
                      loading={pending}
                      disabled={newPassword.length < 8}
                    >
                      Set it
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="max-w-xl space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              options={domains.map((name) => ({ value: name, label: name }))}
            />
            <Input
              label="Name"
              hint="The part before the @."
              value={localPart}
              onChange={(event) => setLocalPart(event.target.value)}
              placeholder="support"
            />
          </div>
          <Input
            label="Password"
            type="password"
            hint="At least eight characters. It is shown once, and never again."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? <ErrorState message={error} /> : null}

          <Button
            variant="primary"
            onClick={create}
            loading={pending}
            disabled={!domain || !localPart.trim() || password.length < 8}
          >
            Create the mailbox
          </Button>
        </div>
      </Card>
    </div>
  );
}
