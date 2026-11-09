import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  currentSession,
  currentSessionToken,
  sessionCredential,
} from '@/lib/auth/session';
import { admin } from '@/lib/stalwart/admin';
import {
  listIdentitiesOfUser,
  listMailboxesOfUser,
} from '@/lib/stalwart/mailbox';
import {
  Badge,
  Card,
  EmptyState,
  ErrorNote,
  PageFrame,
  PrimaryButton,
} from '@/components/ui';
import { SignOut } from '@/components/sign-out';

/**
 * The dashboard, for whoever is signed in.
 *
 *   - the platform admin: the mail platform at a glance — the accounts and
 *     domains Stalwart knows, and the door to the admin area;
 *   - a mailbox user: their own mailboxes with their real counts, their
 *     sending identities — nothing else, read as that user over JMAP.
 *
 * Every number is read from Stalwart this second. If Stalwart does not
 * answer, the screen says so instead of showing a photograph.
 */
export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect('/login');

  if (session.kind === 'admin') {
    return <AdminDashboard />;
  }
  return <MailboxDashboard email={session.email} />;
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
    <PageFrame
      title="The mail platform"
      description="What Stalwart knows right now, and where to manage it."
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone="accent">admin</Badge>
          <span className="text-sm text-text-dim">
            {accounts.length} account{accounts.length === 1 ? '' : 's'} ·{' '}
            {domains.length} domain{domains.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-accent hover:underline">
            Manage accounts and domains
          </Link>
          <SignOut />
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorNote>
            Stalwart did not answer: {error}. The mail platform is not
            reachable from here.
          </ErrorNote>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Accounts" description="The mailboxes Stalwart holds.">
          {accounts.length === 0 ? (
            <p className="text-sm text-text-dim">
              No accounts yet. Create the first one in the admin area.
            </p>
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
            <p className="text-sm text-text-dim">No domains yet.</p>
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
    </PageFrame>
  );
}

/**
 * The mailbox user's view. The visit's credential was proven at sign-in and
 * kept in process memory for this session — so the account's mailboxes and
 * identities are read as that user over JMAP, and the password is never
 * stored on disk.
 */
async function MailboxDashboard({ email }: { email: string }) {
  const token = await currentSessionToken();
  const credential = token ? sessionCredential(token) : null;

  // After a server restart the in-memory credential is gone: sign in again.
  if (!credential) {
    return (
      <PageFrame
        title="Your mail"
        description={`${email} — sign the visit back in to see it.`}
      >
        <div className="mb-4 flex justify-end">
          <SignOut />
        </div>
        <EmptyState
          title="Sign in again"
          body="The visit ended when the server restarted. The mail is safe at Stalwart — sign in once more and it is right here."
          action={
            <Link href="/login">
              <PrimaryButton type="button">Sign in</PrimaryButton>
            </Link>
          }
        />
      </PageFrame>
    );
  }

  let mailboxes: Awaited<ReturnType<typeof listMailboxesOfUser>> = [];
  let identities: Awaited<ReturnType<typeof listIdentitiesOfUser>> = [];
  let error: string | null = null;
  try {
    [mailboxes, identities] = await Promise.all([
      listMailboxesOfUser(credential.user, credential.pass),
      listIdentitiesOfUser(credential.user, credential.pass),
    ]);
  } catch (err) {
    error = (err as Error).message;
  }

  const unread = mailboxes.reduce((sum, m) => sum + m.unreadEmails, 0);

  return (
    <PageFrame
      title="Your mail"
      description={`${email} — the account, its mailboxes, and its sending identities.`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone="accent">mailbox</Badge>
          <span className="text-sm text-text-dim">
            {unread} unread across {mailboxes.length} mailbox
            {mailboxes.length === 1 ? '' : 'es'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/mail/inbox"
            className="hidden sm:inline"
          >
            <PrimaryButton type="button">Open the inbox</PrimaryButton>
          </Link>
          <SignOut />
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorNote>
            Stalwart did not answer: {error}. The mailbox is not reachable
            from here.
          </ErrorNote>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          title="Mailboxes"
          description="The folders Stalwart keeps for this account."
        >
          {mailboxes.length === 0 ? (
            <p className="text-sm text-text-dim">
              No mailboxes yet — the account is new, and Stalwart opens the
              standard set on first use.
            </p>
          ) : (
            <ul className="divide-y divide-rail">
              {mailboxes.map((mailbox) => (
                <li
                  key={mailbox.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm text-text">{mailbox.name}</span>
                  <span className="text-xs text-text-dim">
                    {mailbox.unreadEmails} unread · {mailbox.totalEmails}{' '}
                    total
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Sending identities"
          description="From where, and as who, this account sends."
        >
          {identities.length === 0 ? (
            <p className="text-sm text-text-dim">
              No identities yet. The first appears when the account is used.
            </p>
          ) : (
            <ul className="divide-y divide-rail">
              {identities.map((identity) => (
                <li
                  key={identity.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="truncate text-sm text-text">
                    {identity.name || identity.email}
                  </span>
                  <Badge tone={identity.isDefault ? 'accent' : 'neutral'}>
                    {identity.isDefault ? 'default' : 'extra'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PageFrame>
  );
}
