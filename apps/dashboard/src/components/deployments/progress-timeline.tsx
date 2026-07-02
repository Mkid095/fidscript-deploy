'use client';

import { Card } from '@fidscript/ui';

import { STEPS, stepIndex, statusMeta, TERMINAL_STEP_KEYS } from './status-utils';
import { VerticalTimeline } from './vertical-timeline';
import { RoadmapTimeline } from './roadmap-timeline';
import { TerminalState } from './terminal-state';

interface ProgressTimelineProps {
  status?: string;
}

export function ProgressTimeline({ status }: ProgressTimelineProps) {
  const current = stepIndex(status);
  const meta = statusMeta(status);
  const isFailed = status === 'FAILED';
  const isSuccess = status === 'SUCCESS';
  const isStopped = status === 'STOPPED';
  const isRolledBack = status === 'ROLLED_BACK';
  const isTerminated = TERMINAL_STEP_KEYS.includes(status as typeof TERMINAL_STEP_KEYS[number]);

  return (
    <Card className="border border-[var(--rail)] p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Deployment Progress</h2>

      {/* Mobile: Vertical layout */}
      <div className="flex flex-col sm:hidden">
        <VerticalTimeline
          current={current}
          isFailed={isFailed}
          isSuccess={isSuccess}
          status={status}
          meta={meta}
        />
        {isTerminated && <TerminalState status={status} />}
      </div>

      {/* Desktop: Roadmap-style timeline */}
      <div className="hidden sm:block">
        <RoadmapTimeline
          current={current}
          isFailed={isFailed}
          isSuccess={isSuccess}
          isStopped={isStopped}
          isRolledBack={isRolledBack}
          status={status}
        />
      </div>

      {/* Desktop terminal state */}
      {isTerminated && (
        <div className="hidden sm:flex mt-4">
          <TerminalState status={status} />
        </div>
      )}
    </Card>
  );
}
