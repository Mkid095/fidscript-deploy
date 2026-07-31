'use client';

import { useState } from 'react';
import { WelcomeStep } from './steps/welcome-step';
import { DiscoveryStep } from './steps/discovery-step';
import { ConfigureStep } from './steps/configure-step';
import { ProgressStep } from './steps/progress-step';
import { CompleteStep } from './steps/complete-step';

type WizardStep = 'welcome' | 'discovery' | 'configure' | 'progress' | 'complete';

export default function OnboardingPage() {
  const [step, setStep] = useState<WizardStep>('welcome');

  // Cross-step state: discovery data flows into configure and progress
  const [discoveredServerIp, setDiscoveredServerIp] = useState('');
  const [discoveredAdminEmail, setDiscoveredAdminEmail] = useState('');

  // ── Step transitions ─────────────────────────────────────────────
  function handleStart() {
    setStep('discovery');
  }

  function handleDiscoveryComplete(data: { serverIp: string; adminEmail: string }) {
    setDiscoveredServerIp(data.serverIp);
    setDiscoveredAdminEmail(data.adminEmail);
    setStep('configure');
  }

  function handleConfigure() {
    setStep('progress');
  }

  function handleProgressComplete() {
    setStep('complete');
  }

  function handleContinue() {
    document.cookie = 'fidscript_onboarded=1; path=/; max-age=31536000';
    window.location.href = '/login';
  }

  // ── Render step ──────────────────────────────────────────────────
  if (step === 'welcome') {
    return <WelcomeStep onStart={handleStart} />;
  }

  if (step === 'discovery') {
    return (
      <DiscoveryStep
        onComplete={handleDiscoveryComplete}
      />
    );
  }

  if (step === 'configure') {
    return (
      <ConfigureStep
        prefillServerIp={discoveredServerIp}
        prefillAdminEmail={discoveredAdminEmail}
        onConfigure={handleConfigure}
      />
    );
  }

  if (step === 'progress') {
    return (
      <ProgressStep
        serverIp={discoveredServerIp}
        adminEmail={discoveredAdminEmail}
        onComplete={handleProgressComplete}
      />
    );
  }

  return <CompleteStep onContinue={handleContinue} />;
}
