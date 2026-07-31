'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HealthRow } from '../components/health-row';
import { FormField, formInputClass } from '../components/form-field';
import { OnboardingShell } from '../components/onboarding-shell';
import { useDiscovery } from '../hooks/use-discovery';

interface DiscoveryStepProps {
  onComplete: (data: { serverIp: string; adminEmail: string }) => void;
}

export function DiscoveryStep({ onComplete }: DiscoveryStepProps) {
  const [manualIp, setManualIp] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const { checks, error, result } = useDiscovery({ manualMode, manualIp });

  const canContinue = checks.every(c => c.ok !== false)
    && (manualMode ? !!manualIp.trim() : true);
  const needsManual = checks.find(c => c.id === 'server')?.detail?.includes('enter manually');

  function handleManualChange(value: string) {
    setManualIp(value);
    setManualMode(!!value.trim());
  }

  function handleContinue() {
    if (!result) return;
    onComplete({
      serverIp: manualMode ? manualIp : result.serverIp,
      adminEmail: result.adminEmail,
    });
  }

  return (
    <OnboardingShell
      title="Discovering your system"
      subtitle="Checking infrastructure before configuration"
      maxWidth="560"
    >
      <div className="space-y-2.5 mb-6">
        {checks.map(c => (
          <HealthRow key={c.id} label={c.label} detail={c.detail} ok={c.ok} />
        ))}
      </div>
      {error && (
        <div className="mb-5 p-3.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20">
          <div className="flex items-start gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--danger)]">Unable to contact installation service</p>
              <p className="text-xs text-[var(--danger)]/80 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()} className="mt-2.5">
            Retry
          </Button>
        </div>
      )}
      {needsManual && (
        <div className="mb-5">
          <FormField label="Server IP (auto-detect failed)">
            <input
              type="text"
              value={manualIp}
              onChange={e => handleManualChange(e.target.value)}
              placeholder="203.0.113.42"
              className={formInputClass}
            />
          </FormField>
        </div>
      )}
      {canContinue && (
        <div className="mb-5 p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 flex items-center justify-center gap-2">
          <HugeiconsIcon icon={Tick02Icon} size={14} className="text-[var(--success)]" />
          <span className="text-sm text-[var(--success)] font-medium">
            All checks passed — ready to configure
          </span>
        </div>
      )}
      <Button
        variant="primary"
        disabled={!canContinue}
        onClick={handleContinue}
        className="w-full"
        size="md"
      >
        Continue
      </Button>
    </OnboardingShell>
  );
}
