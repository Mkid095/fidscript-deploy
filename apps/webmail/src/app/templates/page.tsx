import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { TemplatesView } from '@/components/mailbox/templates-view';

/**
 * Templates, standalone. The in-app Workspace row renders the same view
 * inside the mailbox app, where "use in the composer" is wired up; on this
 * route the designer stands on its own.
 */
export default async function TemplatesPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TemplatesView email={session.email} />
    </div>
  );
}
