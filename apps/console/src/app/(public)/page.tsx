import { redirect } from 'next/navigation';

import { sessionUser } from '@/lib/api/platform';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingApplications } from '@/components/landing/landing-applications';
import { LandingLevels } from '@/components/landing/landing-levels';
import { LandingFooter } from '@/components/landing/landing-footer';

/**
 * The platform's front door.
 *
 * It says what the platform is — a control plane that installs applications
 * once — and it is the way in. An operator who is **already signed in** has
 * no business on a marketing page: they are in the platform, and the
 * platform's front door is the overview.
 */
export default async function LandingPage() {
  const user = await sessionUser();
  if (user) redirect('/overview');

  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingApplications />
        <LandingLevels />
      </main>
      <LandingFooter />
    </div>
  );
}
