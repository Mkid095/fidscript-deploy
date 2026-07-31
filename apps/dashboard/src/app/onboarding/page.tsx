'use client';

import { useState } from 'react';
import { WelcomeStep } from './steps/welcome-step';
import { DiscoveryStep } from './steps/discovery-step';
import { ConfigureStep } from './steps/configure-step';
import { ProgressStep } from './steps/progress-step';
import { CompleteStep } from './steps/complete-step';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

type WizardStep = 'welcome' | 'discovery' | 'configure' | 'progress' | 'complete';

interface ConfigureData {
  platformName: string;
  platformDomain: string;
  serverIp: string;
  adminEmail: string;
  authMethod: AuthMethod;
  adminPassword: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [discoveredServerIp, setDiscoveredServerIp] = useState('');
  const [discoveredAdminEmail, setDiscoveredAdminEmail] = useState('');
  const [configureData, setConfigureData] = useState<ConfigureData | null>(null);

  function handleStart() {
    setStep('discovery');
  }

  function handleDiscoveryComplete(data: { serverIp: string; adminEmail: string }) {
    setDiscoveredServerIp(data.serverIp);
    setDiscoveredAdminEmail(data.adminEmail);
    setStep('configure');
  }

  function handleConfigure(data: ConfigureData) {
    setConfigureData(data);
    setStep('progress');
  }

  function handleProgressComplete() {
    setStep('complete');
  }

  function handleContinue() {
    document.cookie = 'fidscript_onboarded=1; path=/; max-age=31536000';
    window.location.href = '/login';
  }

  if (step === 'welcome') return <WelcomeStep onStart={handleStart} />;
  if (step === 'discovery') return <DiscoveryStep onComplete={handleDiscoveryComplete} />;
  if (step === 'configure') return <ConfigureStep prefillServerIp={discoveredServerIp} prefillAdminEmail={discoveredAdminEmail} onConfigure={handleConfigure} />;
  if (step === 'progress') return <ProgressStep configureData={configureData!} onComplete={handleProgressComplete} />;
  return <CompleteStep onContinue={handleContinue} />;
}
