import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { sessionUser } from '@/lib/api/platform';
import { listProjects } from '@/lib/api/projects';
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

  // The first-time journey is **offered** to somebody who has nothing yet.
  // The projects page is left alone — it is where a project is made, and
  // the journey makes one too.
  if (!user.onboardedAt && pathname !== '/projects') {
    const projects = await listProjects().catch(() => []);
    if (projects.length === 0) redirect('/welcome');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <TopBar pathname={pathname} name={user.name} email={user.email} />
      <main className="scroll-area flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
