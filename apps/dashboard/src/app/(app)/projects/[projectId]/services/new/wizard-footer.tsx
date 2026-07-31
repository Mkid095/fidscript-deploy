// Wizard footer for the new deployment page

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Upload02Icon } from '@hugeicons/core-free-icons';

import { STEPS } from './new-deploy-utils';

interface WizardFooterProps {
  stepIndex: number;
  canContinue: boolean;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
  onDeploy: () => void;
}

export function WizardFooter({ stepIndex, canContinue, submitting, onBack, onContinue, onDeploy }: WizardFooterProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 border-t border-[var(--rail)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={stepIndex === 0}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={13} /> Back
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button variant="primary" size="sm" onClick={onContinue} disabled={!canContinue}>
            Continue <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onDeploy} loading={submitting} disabled={!canContinue}>
            <HugeiconsIcon icon={Upload02Icon} size={13} />
            {submitting ? 'Deploying…' : 'Deploy'}
          </Button>
        )}
      </div>
    </div>
  );
}
