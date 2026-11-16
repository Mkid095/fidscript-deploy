import { redirect } from 'next/navigation';

import { currentSession } from '@/lib/auth/session';
import { SettingsPanel } from '@/components/settings/settings-panel';

export default async function SettingsPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  return <SettingsPanel email={session.email} />;
}
