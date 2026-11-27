import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { SettingsView } from '@/components/mailbox/settings-view';

/**
 * The account's settings, standalone. The in-app Workspace row renders the
 * same view inside the mailbox app; this keeps the deep link honest too.
 */
export default async function SettingsPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SettingsView email={session.email} />
    </div>
  );
}
