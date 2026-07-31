'use client';

import { useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { HealthRow } from '../components/health-row';
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
    onComplete({ serverIp: manualMode ? manualIp : result.serverIp, adminEmail: result.adminEmail });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-2xl border border-[var(--rail)]">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-[var(--text)] mb-1">Discovering your system</div>
          <div className="text-sm text-[var(--text-muted)]">Checking infrastructure before configuration.</div>
        </div>
        <div className="space-y-2 mb-6">
          {checks.map(c => (
            <HealthRow key={c.id} label={c.label} detail={c.detail} ok={c.ok} />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">
            <div className="font-medium mb-1">Unable to contact installation service.</div>
            <div className="text-[var(--danger)] text-xs">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {needsManual && (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Server IP (auto-detect failed)</label>
            <input
              type="text"
              value={manualIp}
              onChange={e => handleManualChange(e.target.value)}
              placeholder="203.0.113.42"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        {canContinue && (
          <div className="p-3 rounded-lg bg-emerald-900/30 border border-[var(--success)]/30 text-center text-sm text-[var(--success)] mb-4">
            All checks passed — ready to configure.
          </div>
        )}
        <Button variant="primary" disabled={!canContinue} onClick={handleContinue} className="w-full">
          Continue
        </Button>
      </Card>
    </div>
  );
}
