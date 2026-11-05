'use client';

import Link from 'next/link';
import { Stepper } from '@fidscript/ui';
import type { StepperStep } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

const STEPS: StepperStep[] = [
  { label: 'Import' },
  { label: 'Project' },
  { label: 'Deploy' },
];

/**
 * The wizard's header — where the operator is, and how to get back.
 */
export function WizardHeader({
  step,
  completed,
  onStepClick,
}: {
  step: number;
  completed: Set<number>;
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-[var(--rail)]">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-3"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={12} /> Back to projects
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">New deployment</h1>
        <div className="hidden sm:block mt-4">
          <Stepper steps={STEPS} current={step} completed={completed} onStepClick={onStepClick} />
        </div>
      </div>
    </div>
  );
}
