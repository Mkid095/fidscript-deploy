import { redirect } from 'next/navigation';
import Link from 'next/link';

import { currentSession } from '@/lib/auth/session';
import { admin } from '@/lib/stalwart/admin';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Page,
} from '@/components/ui';
import { SignOut } from '@/components/sign-out';

/**
 * The dashboard, for whoever is signed in.
 *
 *   - the platform admin: the mail platform at a glance — the accounts and
 *     domains Stalwart knows, and the door to the admin area;
 *   - a mailbox user: no page of their own — the inbox is the front
 *     door, so the visit goes straight there.
 *
 * Every number is read from Stalwart this second. If Stalwart does not
 * answer, the screen says so instead of showing a photograph.
 */
export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect('/login');

  // The mailbox's own home is the mail app; the admin keeps this page.
  if (session.kind === 'mailbox') redirect('/mail/inbox');

  return <AdminDashboard />;
}

async function AdminDashboard() {
  let accounts: Awaited<ReturnType<typeof admin.listAccounts>> = [];
  let domains: Awaited<ReturnType<typeof admin.listDomains>> = [];
  let error: string | null = null;
  try {
    [accounts, domains] = await Promise.all([
      admin.listAccounts(),
      admin.listDomains(),
    ]);
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <Page
      title="The mail platform"
      description="What Stalwart knows right now, and where to manage it."
      eyebrow={
        <div className="flex items-center gap-2">
          <Badge tone="accent">admin</Badge>
          <span className="text-xs text-text-dim">
            {accounts.length} account{accounts.length === 1 ? '' : 's'} ·{' '}
            {domains.length} domain{domains.length === 1 ? '' : 's'}
          </span>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Manage accounts and domains
            </Button>
          </Link>
          <SignOut />
        </div>
      }
    >
      {error ? (
        <ErrorState
          title="Stalwart did not answer"
          message={`${error}. The mail platform is not reachable from here.`}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Accounts" description="The mailboxes Stalwart holds.">
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              body="Create the first one in the admin area."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {accounts.slice(0, 10).map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="truncate font-mono text-sm text-text">
                    {account.email}
                  </span>
                  <Badge tone={account.isEnabled ? 'success' : 'warning'}>
                    {account.isEnabled ? 'active' : 'suspended'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Domains" description="The names mail arrives for.">
          {domains.length === 0 ? (
            <EmptyState title="No domains yet" />
          ) : (
            <ul className="divide-y divide-rail">
              {domains.map((domain) => (
                <li
                  key={domain.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="font-mono text-sm text-text">
                    {domain.name}
                  </span>
                  <Badge
                    tone={domain.dkimSelectors.length ? 'success' : 'warning'}
                  >
                    {domain.dkimSelectors.length
                      ? 'DKIM keys'
                      : 'no DKIM policy'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
