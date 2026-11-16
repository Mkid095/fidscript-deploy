import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { HealthReport } from '@/components/admin/health-report';

export default async function MailHealthPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind !== 'admin') redirect('/');
  return <HealthReport />;
}
