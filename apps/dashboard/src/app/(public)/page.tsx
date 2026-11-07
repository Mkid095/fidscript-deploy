'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingOpenSource } from '@/components/landing/landing-opensource';
import { LandingFooter } from '@/components/landing/landing-footer';

/**
 * The platform's front door.
 *
 * It is the marketing page and the way in: a visitor reads what this is and
 * copies the install command; an operator who has already installed it
 * signs in from the same page.
 *
 * An operator who is **already signed in** has no business on a marketing
 * page — they are in the platform, and the platform's front door is the
 * overview. So they are sent there.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/overview');
  }, [user, loading, router]);

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
