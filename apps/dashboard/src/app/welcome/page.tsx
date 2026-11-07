'use client';

/**
 * The first-time journey.
 *
 * Registration or sign-in → what this is → your name → your first project →
 * what to do in it → the project console.
 *
 * It is offered, never forced: a person who already has projects, or who has
 * already finished it, is sent straight on. Every step can be skipped, and
 * the step survives a reload.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useOnboarding } from './hooks/use-onboarding';
import { WelcomeStep } from './steps/welcome-step';
import { AccountStep } from './steps/account-step';
import { ProjectStep } from './steps/project-step';
import { GuidanceStep } from './steps/guidance-step';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const onboarding = useOnboarding();

  // Somebody who has already finished the journey has no business here.
  useEffect(() => {
    if (!loading && user?.onboardedAt) {
      router.replace('/overview');
    }
  }, [loading, user?.onboardedAt, router]);

  if (loading || onboarding.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)]">
        <p className="text-sm text-[var(--text-muted)]">Getting things ready…</p>
      </div>
    );
  }

  if (user?.onboardedAt) return null;

  const { step, setStep } = onboarding;

  return (
    <div className="min-h-screen bg-[var(--surface-2)] px-4 py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
            Getting started
          </p>
          <button
            type="button"
            onClick={onboarding.skip}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Skip
          </button>
        </div>

        {step === 'welcome' && <WelcomeStep onNext={() => setStep('account')} />}
        {step === 'account' && (
          <AccountStep
            onboarding={onboarding}
            onNext={() => setStep('project')}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'project' && (
          <ProjectStep
            onboarding={onboarding}
            onNext={() => setStep('guidance')}
            onBack={() => setStep('account')}
          />
        )}
        {step === 'guidance' && (
          <GuidanceStep
            onboarding={onboarding}
            onFinish={() => {
              const slug = onboarding.draft.projectSlug ?? onboarding.existingProjects[0]?.slug;
              void onboarding.finish().then(() => {
                window.location.href = slug ? `/projects/${slug}` : '/overview';
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
