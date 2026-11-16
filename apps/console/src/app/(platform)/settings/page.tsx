import Link from 'next/link';

import { mfaStatus, sessions, sessionUser } from '@/lib/api/platform';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page, PageColumns } from '@/components/ui/page';
import { DefinitionRow } from '@/components/ui/input';
import { SettingsNav } from '@/components/platform/settings-nav';
import { AccountNameForm } from '@/components/platform/account-name-form';
import { MfaPanel } from '@/components/platform/mfa-panel';
import { SessionList } from '@/components/platform/session-list';

/**
 * Platform settings — the account.
 *
 * The hub for the operator: who they are, what they have open, and where
 * the applications and the keys are. The work sits in the first column;
 * the other surfaces of the platform sit beside it, where the eye can find
 * them without scrolling past the sessions.
 */
export const metadata = { title: 'Settings' };

const SURFACES = [
  {
    href: '/settings/applications',
    title: 'Applications',
    body: 'What this platform has installed, and whether it is healthy.',
  },
  {
    href: '/settings/credentials',
    title: 'Credentials',
    body: 'The email and password the applications answer with — one set, decided here.',
  },
  {
    href: '/settings/api-keys',
    title: 'API keys & MCP',
    body: 'The keys that act as you, and the agent connections.',
  },
  {
    href: '/settings/integrations',
    title: 'Integrations',
    body: 'The GitHub and Cloudflare accounts the platform holds for you.',
  },
];

export default async function SettingsPage() {
  const [user, mfa, open] = await Promise.all([
    sessionUser(),
    mfaStatus().catch(() => null),
    sessions().catch(() => []),
  ]);

  const shown = open.slice(0, 4);
  const rest = open.length - shown.length;

  return (
    <Page
      title="Settings"
      description="Your account, and this platform’s own surfaces."
    >
      <SettingsNav />

      <PageColumns
        aside={
          <section>
            <SectionHeader
              title="The platform's surfaces"
              description="The one-time things live here."
            />
            <div className="space-y-2">
              {SURFACES.map((surface) => (
                <Link
                  key={surface.href}
                  href={surface.href}
                  className="block rounded-lg border border-rail bg-surface p-3 transition-colors hover:border-rail-light"
                >
                  <p className="text-sm font-medium text-text">
                    {surface.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                    {surface.body}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        }
      >
        <section>
          <SectionHeader
            title="Account"
            description="Who you are on this platform."
          />
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
          <SectionHeader
            title="Sessions"
            description={`Where this account is signed in${open.length ? ` — ${open.length} open` : ''}.`}
          />
          <SessionList sessions={shown} />
          {rest > 0 ? (
            <p className="mt-2 text-xs text-text-muted">
              {rest} more, older — end the newest first; each has its own
              control on this list.
            </p>
          ) : null}
        </section>
      </PageColumns>
    </Page>
  );
}
