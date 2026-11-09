import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { TemplatesPanel } from '@/components/templates/templates-panel';

export default async function TemplatesPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');
  return <TemplatesPanel />;
}
