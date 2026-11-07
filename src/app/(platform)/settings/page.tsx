import Link from 'next/link';

import { mfaStatus, sessions, sessionUser } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { DefinitionRow } from '@/components/ui/input';
import { SettingsNav } from '@/components/platform/settings-nav';
import { AccountNameForm } from '@/components/platform/account-name-form';
import { MfaPanel } from '@/components/platform/mfa-panel';
import { SessionList } from '@/components/platform/session-list';

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
    <Page>
      <PageHeader title="Settings" description="Your account, and this platform’s own surfaces." />
      <SettingsNav />

      <section>
        <SectionHeader title="Account" description="Who you are on this platform." />
        <Card className="px-4 py-2">
          <dl className="divide-y divide-rail">
            <DefinitionRow term="Email">{user?.email ?? '—'}</DefinitionRow>
            <DefinitionRow term="Role">{user?.role ?? '—'}</DefinitionRow>
          </dl>
          <div className="py-3">
            <AccountNameForm name={user?.name ?? null} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Two-factor"
          description="A code from your authenticator app, as well as your password."
        />
        <MfaPanel
          enabled={mfa?.enabled ?? false}
          recoveryCodesRemaining={mfa?.recoveryCodesRemaining ?? 0}
        />
      </section>

      <section>
        <SectionHeader title="Sessions" description="Where this account is signed in." />
        <SessionList sessions={open} />
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
    </Page>
  );
}
