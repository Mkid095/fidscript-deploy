import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingOpenSource } from '@/components/landing/landing-opensource';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-ink-950">
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
