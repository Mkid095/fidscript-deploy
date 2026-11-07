import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { sessionUser } from '@/lib/api/platform';
import { TopBar } from '@/components/platform/top-bar';

/**
 * The platform's shell.
 *
 * Every screen here belongs to the **platform** level: the operator's own
 * account, their projects, and the settings. A project's own screens live
 * under `/projects/[projectId]` and have their own shell.
 *
 * A person with no session is sent to sign in, and the page they were
 * going to is remembered.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await sessionUser();
  if (!user) {
    const path = (await headers()).get('x-pathname') ?? '';
    redirect(`/login${path ? `?next=${encodeURIComponent(path)}` : ''}`);
  }

  const pathname = (await headers()).get('x-pathname') ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TopBar pathname={pathname} name={user.name} email={user.email} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
