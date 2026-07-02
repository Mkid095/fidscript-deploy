'use client';

import { STEPS } from './status-utils';
import { StepIcon } from './step-icon';

interface HorizontalTimelineProps {
  current: number;
  isFailed: boolean;
  isSuccess: boolean;
}

export function HorizontalTimeline({ current, isFailed, isSuccess }: HorizontalTimelineProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map((step, i) => {
        const reached = i < current;
        const isCurrent = i === current;
        const isFailedStep = isFailed && isCurrent;
        const isSuccessStep = isSuccess && isCurrent;
        const isNextInFlight = i === current - 1;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <StepNode
              reached={reached}
              isCurrent={isCurrent}
              isFailedStep={isFailedStep}
              isSuccessStep={isSuccessStep}
              isFailed={isFailed}
              isSuccess={isSuccess}
              step={step}
              size={18}
            />
            {i < STEPS.length - 1 && (
              <Connector
                isReached={i < current}
                isInFlight={isNextInFlight}
                color={step.color}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepNode({
  reached,
  isCurrent,
  isFailedStep,
  isSuccessStep,
  isFailed,
  isSuccess,
  step,
  size,
}: {
  reached: boolean;
  isCurrent: boolean;
  isFailedStep: boolean;
  isSuccessStep: boolean;
  isFailed: boolean;
  isSuccess: boolean;
  step: (typeof STEPS)[number];
  size: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <StepIcon
        reached={reached}
        isCurrent={isCurrent}
        isFailedStep={isFailedStep}
        isSuccessStep={isSuccessStep}
        isFailed={isFailed}
        isSuccess={isSuccess}
        step={step}
        size={size}
      />
      <span className={`text-xs mt-2 whitespace-nowrap ${
        isCurrent ? 'text-[var(--text)] font-medium' : reached ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'
      }`}>
        {step.label}
      </span>
    </div>
  );
}

function Connector({ isReached, isInFlight, color }: { isReached: boolean; isInFlight: boolean; color: string }) {
  if (isReached) {
    // Completed connector - solid color
    return (
      <div className={`h-0.5 flex-1 min-w-[8px] ${color} transition-all`} />
    );
  }

  if (isInFlight) {
    // Active connector - animated loading with gradient
    return (
      <div className="h-0.5 flex-1 min-w-[8px] bg-[var(--rail)] relative overflow-hidden">
        <div className="absolute inset-0 animate-connector-load">
          <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        </div>
      </div>
    );
  }

  // Pending connector - dim rail
  return <div className="h-0.5 flex-1 min-w-[8px] bg-[var(--rail)]" />;
}
