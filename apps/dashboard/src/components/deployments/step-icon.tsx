'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  CheckCircle,
  CheckmarkCircle01Icon,
  Loading04Icon,
} from '@hugeicons/core-free-icons';

import type { DeploymentStep } from './progress-types';

interface StepIconProps {
  reached: boolean;
  isCurrent: boolean;
  isFailedStep: boolean;
  isSuccessStep: boolean;
  isFailed: boolean;
  isSuccess: boolean;
  step: DeploymentStep;
  size: number;
}

export function StepIcon({
  reached,
  isCurrent,
  isFailedStep,
  isSuccessStep,
  isFailed,
  isSuccess,
  step,
  size,
}: StepIconProps) {
  const ringClass = isCurrent && !isFailed && !isSuccess
    ? 'ring-2 ring-offset-2 ring-amber-500/50 ring-offset-[var(--surface)]'
    : '';

  const bgClass = reached
    ? isFailedStep
      ? 'bg-[var(--danger)]'
      : isSuccessStep
        ? 'bg-[var(--success)]'
        : step.color
    : 'bg-[var(--rail)] text-[var(--text-dim)]';

  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all flex-shrink-0 ${bgClass} ${ringClass}`}>
      {isFailedStep ? (
        <HugeiconsIcon icon={AlertCircleIcon} size={size} />
      ) : isSuccessStep ? (
        <HugeiconsIcon icon={CheckCircle} size={size} />
      ) : isCurrent ? (
        <HugeiconsIcon icon={Loading04Icon} size={size} className="animate-spin" />
      ) : reached ? (
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={size} />
      ) : (
        <span>{step.phase}</span>
      )}
    </div>
  );
}
