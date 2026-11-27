import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { currentSession, currentSessionToken, sessionCredential } from '@/lib/auth/session';
import { listIdentities, listMailboxes, type Identity, type Mailbox } from '@/lib/stalwart/mail';
import { MailboxApp } from '@/components/mailbox/mailbox-app';

/**
 * A folder view, the whole app mounted around it.
 *
 * The slug is the URL's source of truth for which folder is open; the
 * selected message (?m=) is read here and handed down, so a deep link
 * lands on the folder with the message open from the very first paint —
 * the app keeps the live value in step with the URL afterwards. The
 * server answers for the folder list and the identities too: cheap, and
 * it keeps the guard honest, since the credential is the session's own.
 */
export default async function MailboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const session = await currentSession();
  if (!session || session.kind !== 'mailbox') notFound();
  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) notFound();

  // A folder that does not exist still gets the app, with an honest
  // error in the list — the rail's other folders remain reachable.
  const [mailboxes, identities] = await Promise.all([
    listMailboxes(cred).catch(() => [] as Mailbox[]),
    listIdentities(cred).catch(() => [] as Identity[]),
  ]);

  const initialMessageId =
    typeof sp.m === 'string' && sp.m.length > 0 ? sp.m : null;

  // The app reads the URL's search params; the boundary keeps that
  // answerable on the first paint, in dev and in production alike.
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
        </div>
      }
    >
      <MailboxApp
        email={session.email}
        mailboxes={mailboxes}
        identities={identities}
        folderSlug={slug}
        initialMessageId={initialMessageId}
      />
    </Suspense>
  );
}
