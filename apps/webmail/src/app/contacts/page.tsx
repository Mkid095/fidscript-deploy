import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { ContactsPanel } from '@/components/contacts/contacts-panel';

export default async function ContactsPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  return <ContactsPanel email={session.email} />;
}
