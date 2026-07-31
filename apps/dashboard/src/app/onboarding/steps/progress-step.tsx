'use client';

import { Spinner, Badge } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { OnboardingShell } from '../components/onboarding-shell';
import { useConfigureSSE } from '../hooks/use-configure-sse';

interface ConfigureData {
  platformName: string;
  platformDomain: string;
  serverIp: string;
  adminEmail: string;
  authMethod: 'PASSWORD' | 'MAGIC_CODE';
  adminPassword: string;
}

interface ProgressStepProps {
  configureData: ConfigureData;
  onComplete: () => void;
}

export function ProgressStep({ configureData, onComplete }: ProgressStepProps) {
  const { configLogs, configComplete } = useConfigureSSE({ configureData, onComplete });

  return (
    <OnboardingShell
      title="Configuring your platform"
      subtitle="This usually takes about a minute."
    >
      <div className="space-y-2.5">
        {configLogs.map((log, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <HugeiconsIcon
              icon={log.ok ? Tick02Icon : AlertCircleIcon}
              size={16}
              className={`flex-shrink-0 mt-0.5 ${
                log.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}
            />
            <span className={log.ok ? 'text-[var(--text-muted)]' : 'text-[var(--danger)]'}>
              {log.text}
            </span>
          </div>
        ))}
        {!configComplete && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-muted)] pt-1">
            <Spinner size="sm" />
            <span>Processing…</span>
          </div>
        )}
        {configComplete && (
          <div className="pt-3 flex justify-center">
            <Badge variant="success">
              <HugeiconsIcon icon={Tick02Icon} size={12} />
              Configuration complete
            </Badge>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
