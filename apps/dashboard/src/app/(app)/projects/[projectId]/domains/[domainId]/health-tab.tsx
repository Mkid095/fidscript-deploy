'use client';

import type { DomainHealth } from '@fidscript-deploy/sdk';
import { Button, Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useDomainHealth } from '../domain-tab-hooks';

interface Props {
  projectId: string;
  domainId: string;
}

export default function HealthTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const { health, loading, checkingHealth, triggerHealthCheck } = useDomainHealth(projectId, domainId, getSdk, { polling: true });

  async function handleHealthCheck() {
    await triggerHealthCheck();
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
