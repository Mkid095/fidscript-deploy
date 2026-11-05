'use client';

import { Button } from '@fidscript/ui';

/**
 * The wizard's footer — back, and the one button that moves forward.
 *
 * The label says what the next step DOES: continuing from the import step
 * only chooses the project, and creating the project is a different thing
 * from starting a deployment.
 */
export function WizardFooter({
  step,
  canContinue,
  busy,
  onBack,
  onContinue,
  onDeploy,
}: {
  step: number;
  canContinue: boolean;
  busy: boolean;
  onBack: () => void;
  onContinue: () => void;
  onDeploy: () => void;
}) {
  return (
    <div className="border-t border-[var(--rail)] bg-[var(--surface-2)] px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button variant="primary" onClick={onContinue} disabled={!canContinue || busy} loading={busy}>
            {step === 0 ? 'Continue' : 'Create the project'}
          </Button>
        ) : (
          <Button variant="primary" onClick={onDeploy} disabled={busy} loading={busy}>
            Deploy
          </Button>
        )}
      </div>
    </div>
  );
}
