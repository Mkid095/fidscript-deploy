'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { useSetupSSE } from '../hooks/use-setup-sse';

const STEP_LABELS: Record<string, string> = {
  dns: 'DNS',
  proxy: 'Proxy',
  certificate: 'Certificate',
  email: 'Email',
  health: 'Health',
};

interface ProgressStepProps {
  operationId: string | null;
  onReset: () => void;
}

export function ProgressStep({ operationId, onReset }: ProgressStepProps) {
  const { progressSteps, currentStep, error } = useSetupSSE(operationId);

  return (
    <Card padding="lg">
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Configuring Your Platform</h2>
      {!error && (
        <p className="text-sm text-[var(--text-muted)] mb-8">
          This takes a few minutes. Please wait…
        </p>
      )}

      <div className="flex flex-col gap-3 mb-8">
        {(['dns', 'proxy', 'certificate', 'email', 'health'] as const).map(key => {
          const label = STEP_LABELS[key] ?? key;
          const status = progressSteps[key] ?? 'pending';
          const isCurrent = currentStep === key && status === 'pending';

          return (
            <div key={key} className="flex items-center gap-3">
              {status === 'done' ? (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-400 shrink-0" />
              ) : status === 'error' ? (
                <span className="text-[var(--danger)] text-sm shrink-0"></span>
              ) : isCurrent ? (
                <Spinner size="sm" className="text-[var(--accent)] shrink-0" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border border-slate-600 shrink-0" />
              )}
              <span className={`text-sm ${
                status === 'done' ? 'text-green-400'
                  : status === 'error' ? 'text-[var(--danger)]'
                  : isCurrent ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)]'
              }`}>
                {label}
              </span>
              {isCurrent && <span className="text-xs text-[var(--text-muted)] animate-pulse">running…</span>}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30">
            <span className="text-[var(--danger)] shrink-0 mt-0.5"></span>
            <div>
              <p className="text-sm text-[var(--danger)] font-medium">Configuration failed</p>
              <p className="text-xs text-[var(--danger)]/80 mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="w-full py-3 rounded-lg border border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-slate-500 text-sm transition-colors"
          >
            Run setup again
          </button>
        </div>
      ) : null}
    </Card>
  );
}
