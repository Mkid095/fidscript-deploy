import React from 'react';

/**
 * Stepper — horizontal multi-step progress indicator.
 *
 * Renders numbered circles connected by lines, with labels below.
 * Designed for wizard/checkout flows (e.g. the deploy wizard).
 *
 * Accessibility:
 *   - The list is an ordered list (`<ol>`) with `aria-label`.
 *   - The current step has `aria-current="step"`.
 *   - Completed steps are marked with a check and `aria-label`.
 *
 * Props:
 *   - steps: array of { label, icon? (ReactNode), optional hint? }
 *   - current: zero-based index of the active step
 *   - completed: optional Set<number> of completed step indexes
 *   - onStepClick?: optional click handler; when absent, steps are non-interactive
 *
 * Responsive: labels are hidden below `sm`; only the circles + connectors show.
 */
export interface StepperStep {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

interface StepperProps {
  steps: StepperStep[];
  current: number;
  completed?: Set<number>;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({ steps, current, completed, onStepClick, className = '' }: StepperProps) {
  return (
    <ol
      aria-label="Progress"
      className={`flex items-center w-full ${className}`}
    >
      {steps.map((step, i) => {
        const isComplete = completed?.has(i) ?? i < current;
        const isCurrent = i === current;
        const isLast = i === steps.length - 1;
        const interactive = !!onStepClick && (isComplete || i <= current);

        return (
          <li
            key={step.label}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex items-center ${isLast ? '' : 'flex-1'}`}
          >
            {/* Circle */}
            <button
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onStepClick?.(i)}
              aria-label={`${isComplete ? 'Completed' : 'Step'} ${i + 1}: ${step.label}`}
              className={`
                relative flex items-center justify-center flex-shrink-0
                w-8 h-8 rounded-full border-2 transition-colors duration-200
                ${isComplete
                  ? 'bg-red-600 border-red-600 text-white'
                  : isCurrent
                    ? 'bg-[#0f1117] border-red-500 text-red-400 ring-4 ring-red-500/10'
                    : 'bg-[#0f1117] border-[#2a2d3a] text-slate-600'
                }
                ${interactive ? 'cursor-pointer hover:border-red-400' : 'cursor-default'}
                focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20
              `}
            >
              {isComplete ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step.icon ? (
                <span className="flex items-center justify-center w-4 h-4">{step.icon}</span>
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </button>

            {/* Label (hidden on mobile) */}
            <div className="hidden sm:block ml-2 min-w-0">
              <p
                className={`text-xs font-medium truncate ${
                  isCurrent ? 'text-slate-200' : isComplete ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {step.label}
              </p>
              {step.hint && isCurrent && (
                <p className="text-[10px] text-slate-600 truncate">{step.hint}</p>
              )}
            </div>

            {/* Connector */}
            {!isLast && (
              <div className="flex-1 mx-2 sm:mx-3 h-px min-w-[16px]">
                <div
                  className={`h-full transition-colors duration-300 ${
                    i < current ? 'bg-red-600' : 'bg-[#2a2d3a]'
                  }`}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
