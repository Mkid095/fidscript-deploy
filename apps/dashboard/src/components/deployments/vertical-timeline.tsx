'use client';

import { STEPS, TERMINAL_STEP_KEYS } from './status-utils';
import { StepIcon } from './step-icon';

interface VerticalTimelineProps {
  current: number;
  isFailed: boolean;
  isSuccess: boolean;
  status?: string;
  meta: { label: string; variant: string };
}

export function VerticalTimeline({ current, isFailed, isSuccess, status, meta }: VerticalTimelineProps) {
  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const reached = i < current || (i === current && !(TERMINAL_STEP_KEYS as readonly string[]).includes(status ?? ''));
        const isCurrent = i === current;
        const isFailedStep = isFailed && isCurrent;
        const isSuccessStep = isSuccess && isCurrent;

        return (
          <div key={step.key} className="flex items-start gap-3">
            <TimelineNode
              reached={reached}
              isCurrent={isCurrent}
              isFailedStep={isFailedStep}
              isSuccessStep={isSuccessStep}
              isFailed={isFailed}
              isSuccess={isSuccess}
              step={step}
              size={16}
              showConnector={i < STEPS.length - 1}
              connectorFilled={i < current}
              isInFlightConnector={i === current - 1 && isCurrent}
            />
            <div className="flex-1 pt-1.5 pb-4">
              <p className={`text-sm font-medium ${
                isCurrent ? 'text-[var(--text)]' : reached ? 'text-[var(--text-muted)]' : 'text-[var(--text-dim)]'
              }`}>
                {step.label}
              </p>
              {isCurrent && status && (
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {meta.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineNode({
  reached,
  isCurrent,
  isFailedStep,
  isSuccessStep,
  isFailed,
  isSuccess,
  step,
  size,
  showConnector,
  connectorFilled,
  isInFlightConnector,
}: {
  reached: boolean;
  isCurrent: boolean;
  isFailedStep: boolean;
  isSuccessStep: boolean;
  isFailed: boolean;
  isSuccess: boolean;
  step: (typeof STEPS)[number];
  size: number;
  showConnector: boolean;
  connectorFilled: boolean;
  isInFlightConnector: boolean;
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
      {showConnector && (
        <VerticalConnector
          isFilled={connectorFilled}
          isInFlight={isInFlightConnector}
          color={step.color}
        />
      )}
    </div>
  );
}

function VerticalConnector({ isFilled, isInFlight, color }: { isFilled: boolean; isInFlight: boolean; color: string }) {
  if (isFilled) {
    // Completed connector - solid color
    return <div className={`w-0.5 h-8 ${color} relative overflow-hidden`} />;
  }

  if (isInFlight) {
    // Active connector - animated loading
    return (
      <div className="w-0.5 h-8 bg-[var(--rail)] relative overflow-hidden">
        <div className="absolute inset-0 animate-connector-load-vertical">
          <div className="w-full bg-gradient-to-b from-amber-500 via-yellow-400 to-amber-500" />
        </div>
      </div>
    );
  }

  // Pending connector - dim rail
  return <div className="w-0.5 h-8 bg-[var(--rail)]" />;
}
