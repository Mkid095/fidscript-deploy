import Link from 'next/link';

import { mfaStatus, sessions, sessionUser } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { SettingsNav } from '@/components/platform/settings-nav';
import { DefinitionRow } from '@/components/ui/input';

/**
 * Platform settings — the account.
 *
 * The hub for the operator: who they are, what they have open, and where
 * the applications and the keys are.
 */
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const [user, mfa, open] = await Promise.all([
    sessionUser(),
    mfaStatus().catch(() => null),
    sessions().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your account, and this platform’s own surfaces." />
      <SettingsNav />

      <section>
        <SectionHeader title="Account" description="Who you are on this platform." />
        <Card className="px-4 py-2">
          <dl className="divide-y divide-rail">
            <DefinitionRow term="Email">{user?.email ?? '—'}</DefinitionRow>
            <DefinitionRow term="Name">{user?.name ?? '—'}</DefinitionRow>
            <DefinitionRow term="Role">{user?.role ?? '—'}</DefinitionRow>
            <DefinitionRow term="Two-factor">
              {mfa ? (
                <Badge tone={mfa.enabled ? 'success' : 'neutral'}>
                  {mfa.enabled ? 'On' : 'Not enabled'}
                </Badge>
              ) : (
                'Not available'
              )}
            </DefinitionRow>
          </dl>
        </Card>
        {!mfa ? (
          <p className="mt-2 text-xs text-text-dim">
            The platform did not answer about two-factor. The account above is what it knows.
          </p>
        ) : null}
      </section>

      <section>
        <SectionHeader
          title="Sessions"
          description="Where this account is signed in."
        />
        <Card>
          {open.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No other sessions.</p>
          ) : (
            <ul className="divide-y divide-rail">
              {open.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                      {session.userAgent ?? 'Unknown device'}
                    </p>
                    <p className="truncate text-xs text-text-dim">
                      {session.ipAddress ?? 'Unknown address'} · started{' '}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Applications and keys"
          description="The one-time things live here."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/settings/applications"
            className="rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
          >
            <p className="text-sm font-medium text-text">Applications</p>
            <p className="mt-1 text-xs text-text-muted">
              What this platform has installed, and whether it is healthy.
            </p>
          </Link>
          <Link
            href="/settings/api-keys"
            className="rounded-lg border border-rail bg-surface p-4 transition-colors hover:border-rail-light"
          >
            <p className="text-sm font-medium text-text">API keys &amp; MCP</p>
            <p className="mt-1 text-xs text-text-muted">
              The keys that act as you, and the agent connections.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
