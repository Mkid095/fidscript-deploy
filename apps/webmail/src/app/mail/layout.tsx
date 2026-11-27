import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  currentSession,
  currentSessionToken,
  sessionCredential,
} from '@/lib/auth/session';

/**
 * The mail area: the guard only. The folder pages carry their own
 * full-screen app; the credential check stays here, one place for all
 * of /mail.
 */
export default async function MailLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.kind === 'admin') redirect('/admin');

  const token = await currentSessionToken();
  const cred = token ? sessionCredential(token) : null;
  if (!cred) redirect('/login');

  return <>{children}</>;
}
