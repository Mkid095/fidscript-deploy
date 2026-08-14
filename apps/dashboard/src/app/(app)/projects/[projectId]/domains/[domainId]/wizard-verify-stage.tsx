'use client';

import { useEffect, useState } from 'react';
import type { DomainHealth } from '@fidscript-deploy/sdk';
import { Button, Card, Toast } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';

interface Props {
  projectId: string;
  domainId: string;
}

export function WizardVerifyStage({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [polling, setPolling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function handleVerify() {
    setVerifying(true);
    try {
      await getSdk().domains.verify(projectId, domainId);
      setToast({ message: 'Verification started — checking DNS propagation…', type: 'success' });
      startPoll();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Verification failed', type: 'error' });
      setVerifying(false);
    }
  }

  function startPoll() {
    setPolling(true);
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 20) { setPolling(false); return; }
      attempts++;
      try {
        const h = await getSdk().domains.getHealth(projectId, domainId);
        if (h && h.status !== 'degraded' && h.status !== null) { setHealth(h); setPolling(false); return; }
      } catch { /* continue polling */ }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 3000);
  }

  useEffect(() => { handleVerify(); }, []);

  const score = health?.score ?? 0;
  const scoreColor = score >= 90 ? 'text-[var(--success)]' : score >= 60 ? 'text-yellow-400' : 'text-[var(--danger)]';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" loading={verifying || polling} onClick={handleVerify}>
          {verifying ? 'Verifying…' : polling ? 'Checking…' : 'Verify DNS'}
        </Button>
        {polling && <span className="text-sm text-[var(--text-muted)]">Waiting for propagation…</span>}
      </div>
      {health && (
        <Card className="border border-[var(--rail)]" padding="md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)]">Health Score</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{health.score}<span className="text-sm text-[var(--text-muted)]">/100</span></span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'DNS', ok: health.dnsOk },
              { label: 'Routing', ok: health.routingOk },
              { label: 'SSL', ok: health.sslOk },
              { label: 'Email', ok: health.emailOk },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between rounded border border-[var(--rail)] px-3 py-2">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className={`text-sm ${ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{ok ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          {health.errorMessage && (
            <div className="mt-3 rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
              {health.errorMessage}
            </div>
          )}
        </Card>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
