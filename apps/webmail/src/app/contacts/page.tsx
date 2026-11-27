import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { ContactsView } from '@/components/mailbox/contacts-view';

/**
 * The address book, standalone. The in-app Workspace row renders the same
 * view inside the mailbox app (where "write" opens the composer); on this
 * route it falls back to a plain mailto.
 */
export default async function ContactsPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ContactsView email={session.email} />
    </div>
  );
}
