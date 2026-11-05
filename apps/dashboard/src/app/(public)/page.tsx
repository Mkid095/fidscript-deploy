import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingOpenSource } from '@/components/landing/landing-opensource';
import { LandingFooter } from '@/components/landing/landing-footer';

/**
 * The platform's front door.
 *
 * It is the marketing page and the way in: a visitor reads what this is and
 * copies the install command; an operator who has already installed it signs
 * in from the same page.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingOpenSource />
      </main>
      <LandingFooter />
    </div>
  );
}
