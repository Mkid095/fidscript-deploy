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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const strength = passwordStrength(password);

  function generate() {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const next = Array.from(
      { length: 16 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    setPassword(next);
    setShowPassword(true);
  }

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
      const result = await resetMailboxPasswordAction(
        projectId,
        mailboxId,
        newPassword,
      );
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
          <EmptyState
            title="No mailbox yet"
            body="A mailbox is an address the mail arrives at."
          />
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
                      <p className="truncate text-xs text-text-dim">
                        {mailbox.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={mailbox.isActive ? 'success' : 'neutral'}>
                      {mailbox.isActive ? 'active' : 'suspended'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setResetting(
                          resetting === mailbox.id ? null : mailbox.id,
                        )
                      }
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

          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="grow">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  hint="At least eight characters. It is shown once, and never again."
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pb-7">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={generate}>
                  Generate
                </Button>
              </div>
            </div>
            <StrengthMeter password={password} strength={strength} />
          </div>

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

function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

/**
 * How strong the password reads — four segments, the fourth only for a
 * password that mixes case, digits and a symbol.
 */
function StrengthMeter({
  password,
  strength,
}: {
  password: string;
  strength: { score: number; label: string };
}) {
  if (password.length === 0) return null;
  const tone =
    strength.score >= 3
      ? 'bg-success'
      : strength.score === 2
        ? 'bg-warning'
        : 'bg-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={`h-1 flex-1 rounded-full ${
              segment < strength.score ? tone : 'bg-surface-2'
            }`}
          />
        ))}
      </div>
      <span className="w-14 text-right text-[11px] text-text-dim">
        {strength.label}
      </span>
    </div>
  );
}
