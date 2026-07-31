'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { DomainHealth } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

interface Props {
  projectId: string;
  domainId: string;
}

export default function HealthTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const sdk = getSdk();
      const healthData = await sdk.domains.getHealth(projectId, domainId).catch(() => null);
      setHealth(healthData as DomainHealth | null);
    } catch { } finally { setLoading(false); }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { load(); }, [load]);

  function startPolling() {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    let attempts = 0;
    function poll() {
      if (attempts >= 20) return;
      attempts++;
      getSdk().domains.getHealth(projectId, domainId)
        .then((result: unknown) => {
          const h = result as DomainHealth | null;
          if (h && h.status !== 'degraded') { setHealth(h); setCheckingHealth(false); return; }
          pollingRef.current = setTimeout(poll, 3000);
        })
        .catch(() => { pollingRef.current = setTimeout(poll, 3000); });
    }
    pollingRef.current = setTimeout(poll, 3000);
  }

  async function handleHealthCheck() {
    setCheckingHealth(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      startPolling();
    } catch { setCheckingHealth(false); }
  }
  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  const scoreColor =
    health && health.score >= 90 ? 'text-[var(--success)]' :
    health && health.score >= 60 ? 'text-yellow-400' : 'text-[var(--danger)]';

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" loading={checkingHealth} onClick={handleHealthCheck}>
          {checkingHealth ? 'Checking…' : 'Re-check'}
        </Button>
      </div>
      <Card className="border border-[var(--rail)]" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Health Score Breakdown</h2>
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {health?.score ?? 0}<span className="text-lg text-[var(--text-muted)]">/100</span>
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'DNS Propagation', score: health?.breakdown?.dns ?? 0, max: 30 },
            { label: 'HTTP Routing', score: health?.breakdown?.routing ?? 0, max: 20 },
            { label: 'SSL Certificate', score: health?.breakdown?.ssl ?? 0, max: 30 },
            { label: 'Email DNS (MX/SPF)', score: health?.breakdown?.email ?? 0, max: 20 },
          ].map(({ label, score, max }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="w-40 text-[var(--text-muted)] shrink-0">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--rail)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${score === max ? 'bg-[var(--success)]' : score > 0 ? 'bg-yellow-400' : 'bg-[var(--danger)]'}`}
                  style={{ width: `${(score / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)] w-10 text-right">{score}/{max}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'DNS Propagation', ok: health?.dnsOk, description: 'Domain resolves via public DNS' },
          { label: 'HTTP Routing', ok: health?.routingOk, description: 'HTTP/HTTPS reaches the server' },
          { label: 'SSL Certificate', ok: health?.sslOk, description: 'Valid TLS certificate present' },
          { label: 'Email DNS (MX/SPF)', ok: health?.emailOk, description: 'MX + SPF records found' },
        ].map(({ label, ok, description }) => (
          <Card
            key={label}
            className={`border ${ok === true ? 'border-[var(--success)]/30' : ok === false ? 'border-[var(--danger)]/30' : 'border-[var(--rail)]'}`}
            padding="lg"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text)]">{label}</h3>
              <span className={`text-2xl ${ok === true ? 'text-[var(--success)]' : ok === false ? 'text-[var(--danger)]' : 'text-[var(--text-dim)]'}`}>
                {ok === true ? '✓' : ok === false ? '✗' : '?'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{description}</p>
          </Card>
        ))}
      </div>
      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Health Details</h2>
        {health ? (
          <dl className="space-y-2.5 text-sm">
            {[
              ['Overall Status', health.status?.toUpperCase() ?? 'UNKNOWN'],
              ['Response Time', health.responseTimeMs !== null ? `${health.responseTimeMs}ms` : 'N/A'],
              ['SSL Expires In', health.sslExpiresInDays !== null ? `${health.sslExpiresInDays} days` : 'N/A'],
              ['Last Checked', new Date(health.checkedAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="text-[var(--text-muted)] w-40 shrink-0">{label}</dt>
                <dd className="text-[var(--text)]">{value}</dd>
              </div>
            ))}
            {health.errorMessage && (
              <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-xs text-[var(--danger)]">
                Error: {health.errorMessage}
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No health data yet. Run a health check to see results.</p>
        )}
      </Card>
      {checkingHealth && (
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <Spinner size="sm" />
          <span>Checking DNS propagation and SSL certificate…</span>
        </div>
      )}
    </div>
  );
}
