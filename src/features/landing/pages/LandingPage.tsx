import React from 'react';
import {
  LandingHero,
  LandingFeatures,
  LandingCalculator,
  LandingSteps,
  LandingFAQ,
  LandingMetrics,
  LandingArchitecture
} from '../components';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-[#080a0d] text-[#e2e8f0] overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#13161c_1px,transparent_1px),linear-gradient(to_bottom,#13161c_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-35 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 py-12 sm:py-20 relative z-10">
        <LandingHero onNavigate={onNavigate} />
        <LandingMetrics />
        <LandingFeatures />
        <LandingArchitecture />
        <LandingCalculator />
        <LandingSteps />
        <LandingFAQ />
      </div>
    </div>
  );
}
