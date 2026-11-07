import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { completeOnboarding, sessionUser } from '@/lib/api/platform';
import { listProjects } from '@/lib/api/projects';
import { WelcomeWizard } from '@/components/auth/welcome-wizard';

export const metadata = { title: 'Welcome' };

/**
 * The first-time journey.
 *
 * It is **offered**, not forced: an account that has already finished it is
 * never made to go through it again.
 *
 * Somebody who was invited into a project has nothing to set up — the guide
 * sends them straight to the project they were invited to, and the journey
 * is marked done so it never asks again.
 */
export default async function WelcomePage() {
  const user = await sessionUser();
  if (!user) redirect('/login');

  if (user.onboardedAt) redirect('/overview');

  // The journey is under way: the project made in its third step must not
  // look like somebody else's project and send the person away.
  const inProgress = (await cookies()).get('fidscript_welcome');
  if (inProgress) return <WelcomeWizard name={user.name} />;

  const projects = await listProjects().catch(() => []);
  if (projects.length > 0) {
    await completeOnboarding().catch(() => null);
    redirect(`/projects/${projects[0].slug}/overview`);
  }

  return <WelcomeWizard name={user.name} />;
}
