import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { AdminPanel } from '@/components/admin/admin-panel';

export default async function AdminPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind !== 'admin') redirect('/');
  return <AdminPanel email={session.email} />;
}
