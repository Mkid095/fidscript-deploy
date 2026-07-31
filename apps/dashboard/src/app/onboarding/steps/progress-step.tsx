'use client';

import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';
import { useConfigureSSE } from '../hooks/use-configure-sse';

interface ProgressStepProps {
  serverIp: string;
  adminEmail: string;
  onComplete: () => void;
}

export function ProgressStep({ serverIp, adminEmail, onComplete }: ProgressStepProps) {
  const { configLogs, configComplete } = useConfigureSSE({
    serverIp,
    adminEmail,
    onComplete,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-[var(--text)] mb-1">Configuring your platform</div>
          <div className="text-sm text-[var(--text-muted)]">This takes about a minute.</div>
        </div>
        <div className="space-y-2 mb-6">
          {configLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`flex-shrink-0 ${log.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {log.ok ? '' : ''}
              </span>
              <span className={log.ok ? 'text-[var(--text-muted)]' : 'text-[var(--danger)]'}>
                {log.text}
              </span>
            </div>
          ))}
          {!configComplete && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Spinner size="sm" />
              <span>Processing…</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
