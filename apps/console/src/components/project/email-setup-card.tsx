'use client';

import { Card } from '@/components/ui/card';

export type EmailTabId =
  | 'domains'
  | 'mailboxes'
  | 'sending'
  | 'inbound'
  | 'activity';

export interface SetupStep {
  id: string;
  label: string;
  done: boolean;
  go: EmailTabId;
}

/**
 * The setup progress.
 *
 * The six things that have to be true before the project's mail works, each
 * computed from what the platform really has — never assumed. A step the
 * workbench has not finished reads as open, and pressing one goes to the
 * tab that does it.
 */
export function EmailSetupCard({
  steps,
  onGo,
}: {
  steps: SetupStep[];
  onGo: (tab: EmailTabId) => void;
}) {
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 border-b border-rail px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Setup</p>
          <p className="mt-0.5 text-xs text-text-dim">
            {next
              ? `Next: ${next.label.toLowerCase()}.`
              : 'Everything is set up.'}
          </p>
        </div>
        <span className="shrink-0 text-xs text-text-dim">
          {doneCount} of {steps.length}
        </span>
      </div>

      <div className="px-4 pt-3">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="grid gap-1 p-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onGo(step.go)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                step.done
                  ? 'text-success'
                  : step.id === next?.id
                    ? 'font-medium text-text'
                    : 'text-text-dim'
              }`}
            >
              <span aria-hidden>{step.done ? '✓' : '·'}</span>
              {step.label}
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
