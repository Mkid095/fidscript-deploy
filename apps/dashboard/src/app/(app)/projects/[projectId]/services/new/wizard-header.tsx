// Wizard header for the new deployment page

import Link from 'next/link';
import { Stepper } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import { STEPS } from './new-deploy-utils';

const STEPS_FOR_STEPPER: StepperStep[] = STEPS.map(s => ({ label: s.label }));

interface WizardHeaderProps {
  projectId: string;
  stepIndex: number;
  completed: Set<number>;
  onStepClick: (i: number) => void;
}

export function WizardHeader({ projectId, stepIndex, completed, onStepClick }: WizardHeaderProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
      <div className="max-w-2xl mx-auto">
        <Link href={`/projects/${projectId}/services`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors mb-3">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to services
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>
        <p className="sm:hidden mt-2 text-xs text-[var(--text-muted)]">
          Step {stepIndex + 1} of {STEPS.length}: <span className="font-medium">{STEPS[stepIndex].label}</span>
        </p>
        <div className="hidden sm:block mt-4">
          <Stepper steps={STEPS_FOR_STEPPER} current={stepIndex} completed={completed}
            onStepClick={onStepClick} />
        </div>
      </div>
    </div>
  );
}
