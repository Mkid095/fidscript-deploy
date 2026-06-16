import React from 'react';

const steps = [
  { num: 1, label: 'Host Hardware' },
  { num: 2, label: 'Network & Admin' },
  { num: 3, label: 'Cluster Config' },
  { num: 4, label: 'Live Server Boot' }
];

interface InstallerStepIndicatorsProps {
  currentStep: number;
}

export default function InstallerStepIndicators({ currentStep }: InstallerStepIndicatorsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-8 text-center text-xs font-semibold">
      {steps.map(item => (
        <div
          key={item.num}
          className={`pb-3 border-b-2 transition ${
            currentStep >= item.num ? 'border-red-500 text-red-500' : 'border-slate-800 text-slate-500'
          }`}
        >
          <div className="font-mono text-sm mb-1">{item.num}</div>
          <div className="hidden sm:block">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
