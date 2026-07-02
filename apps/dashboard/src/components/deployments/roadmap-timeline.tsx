'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  CheckCircle,
  CheckmarkCircle01Icon,
  Loading04Icon,
  StopCircleIcon,
} from '@hugeicons/core-free-icons';

import { STEPS, statusMeta } from './status-utils';

interface RoadmapTimelineProps {
  current: number;
  isFailed: boolean;
  isSuccess: boolean;
  isStopped: boolean;
  isRolledBack: boolean;
  status?: string;
}

export function RoadmapTimeline({
  current,
  isFailed,
  isSuccess,
  isStopped,
  isRolledBack,
  status,
}: RoadmapTimelineProps) {
  const meta = statusMeta(status);
  const isTerminal = isFailed || isStopped || isRolledBack;

  // For terminal states, treat as "failed at the finish line" — steps 0-3 done, step 4 shows failure
  // This gives a logical: progressed through all steps but didn't complete
  const terminalStep = 4; // The "Success" step is where terminal states "fail"

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
      {STEPS.map((step, i) => {
        const reached = i < current;

        // For terminal states, steps before the final step are "done", final step shows failure
        const isFailedStep = isFailed && i === terminalStep;
        const isStoppedStep = isStopped && i === terminalStep;
        const isRolledBackStep = isRolledBack && i === terminalStep;
        const isCurrentStep = i === current && !isTerminal;

        // For a successful deployment, all steps are reached
        const isFullyDone = isSuccess && (reached || i <= current);
        // For a failed/stopped/rolled_back deployment, show steps up to DEPLOYING as done
        const isDoneBeforeFailure = isTerminal && i < terminalStep;

        let state: 'done' | 'failed' | 'stopped' | 'rolled-back' | 'in-progress' | 'upcoming' = 'upcoming';
        if (isFullyDone) state = 'done';
        else if (isDoneBeforeFailure) state = 'done';
        else if (isFailedStep) state = 'failed';
        else if (isStoppedStep) state = 'stopped';
        else if (isRolledBackStep) state = 'rolled-back';
        else if (isCurrentStep) state = 'in-progress';

        const stateStyles = {
          done: 'border-emerald-500/30 bg-emerald-500/5',
          failed: 'border-rose-500/30 bg-rose-500/5',
          stopped: 'border-orange-500/30 bg-orange-500/5',
          'rolled-back': 'border-amber-500/30 bg-amber-500/5',
          'in-progress': 'border-amber-500/30 bg-amber-500/5',
          upcoming: 'border-[var(--rail)] bg-[var(--surface)]',
        };

        const iconBg = {
          done: 'bg-emerald-500',
          failed: 'bg-rose-500',
          stopped: 'bg-orange-500',
          'rolled-back': 'bg-amber-500',
          'in-progress': 'bg-amber-500',
          upcoming: 'bg-[var(--rail)]',
        };

        return (
          <div
            key={step.key}
            className={`
              relative flex flex-col items-center text-center p-3 rounded-xl border transition-all
              ${stateStyles[state]}
            `}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 ${iconBg[state]}`}>
              {state === 'done' ? (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-white" />
              ) : state === 'failed' ? (
                <HugeiconsIcon icon={AlertCircleIcon} size={18} className="text-white" />
              ) : state === 'stopped' ? (
                <HugeiconsIcon icon={StopCircleIcon} size={18} className="text-white" />
              ) : state === 'rolled-back' ? (
                <HugeiconsIcon icon={CheckCircle} size={18} className="text-white" />
              ) : state === 'in-progress' ? (
                <HugeiconsIcon icon={Loading04Icon} size={18} className="text-white animate-spin" />
              ) : (
                <span className="text-xs font-bold text-[var(--text-dim)]">{step.phase}</span>
              )}
            </div>

            {/* Phase label */}
            <span className="text-[10px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">
              Phase {step.phase}
            </span>

            {/* Step name */}
            <span className={`text-sm font-semibold ${
              state === 'in-progress' ? 'text-[var(--text)]'
              : state === 'failed' ? 'text-rose-400'
              : state === 'stopped' ? 'text-orange-400'
              : state === 'rolled-back' ? 'text-amber-400'
              : reached || isSuccess ? 'text-[var(--text-muted)]'
              : 'text-[var(--text-dim)]'
            }`}>
              {step.label}
            </span>

            {/* Status badge */}
            {state === 'in-progress' && (
              <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                {meta.label}
              </span>
            )}
            {state === 'failed' && (
              <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-500/20 text-rose-400">
                Failed
              </span>
            )}
            {state === 'stopped' && (
              <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-500/20 text-orange-400">
                Stopped
              </span>
            )}
            {state === 'rolled-back' && (
              <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">
                Rolled Back
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
