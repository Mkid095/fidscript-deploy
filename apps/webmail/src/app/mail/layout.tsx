import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  currentSession,
  currentSessionToken,
  sessionCredential,
} from '@/lib/auth/session';
import { listMailboxes, type Mailbox } from '@/lib/stalwart/mail';
import { MailShell } from '@/components/mail/mail-shell';
import { ErrorNote } from '@/components/ui';

/**
 * The mail area: signed in as a mailbox, with the visit's credential in
 * hand, or else back to the sign-in page.
 */
export default async function MailLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');

  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) redirect('/login');

  let mailboxes: Mailbox[] = [];
  let error: string | null = null;
  try {
    mailboxes = await listMailboxes(cred);
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <MailShell email={session.email} mailboxes={mailboxes}>
      {error ? (
        <div className="mb-4">
          <ErrorNote>
            Stalwart did not answer: {error}. The mail itself is safe — this
            view is not.
          </ErrorNote>
        </div>
      ) : null}
      {children}
    </MailShell>
  );
}
