'use client';

import { Card, Badge, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import { useDomainOverview } from '../domain-tab-hooks';

interface Props {
  projectId: string;
  domainId: string;
}

function healthScore(health: { score?: number | null } | null): number {
  if (!health) return 0;
  return health.score ?? 0;
}

export default function OverviewTab({ projectId, domainId }: Props) {
  const { getSdk } = useAuth();
  const { domain, health, loading, error } = useDomainOverview(projectId, domainId, getSdk);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  if (error || !domain) return <p className="text-[var(--danger)] text-sm p-4">{error ?? 'Not found'}</p>;

  const score = healthScore(health);
  const scoreColor = score >= 90 ? 'text-[var(--success)]' : score >= 60 ? 'text-yellow-400' : 'text-[var(--danger)]';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Domain Info</h2>
        <dl className="space-y-2.5 text-sm">
          {[
            ['Domain ID', domain.id],
            ['DNS Mode', domain.dnsMode],
            ['SSL Status', domain.sslStatus],
            ['DNS Status', domain.dnsStatus],
            ['Apex Domain', domain.apexDomain ? 'Yes' : 'No'],
            ['Created', new Date(domain.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4">
              <dt className="text-[var(--text-muted)] w-28 shrink-0">{label}</dt>
              <dd className="text-[var(--text)] font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Platform Stats</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-muted)]">Health Score</span>
              <span className="text-lg font-bold text-[var(--accent)]">
                {health?.score ?? 0}<span className="text-xs text-[var(--text-muted)] font-normal">/100</span>
              </span>
            </div>
            <div className="h-1.5 bg-[var(--rail)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${health?.score ?? 0}%` }} />
            </div>
          </div>
          {domain.sslExpiresAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">SSL Expires</span>
              <span className={`text-xs ${(() => {
                const days = Math.ceil((new Date(domain.sslExpiresAt!).getTime() - Date.now()) / 86400000);
                return days < 30 ? 'text-yellow-400' : 'text-[var(--text-muted)]';
              })()}`}>
                {new Date(domain.sslExpiresAt).toLocaleDateString()} ({Math.ceil((new Date(domain.sslExpiresAt).getTime() - Date.now()) / 86400000)}d)
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">DNS Provider</span>
            <Badge variant={domain.dnsMode === 'cloudflare_auto' ? 'info' : 'default'}>
              {domain.dnsMode === 'cloudflare_auto' ? 'Cloudflare' : 'Manual'}
            </Badge>
          </div>
          {domain.lastVerifiedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">Last Verified</span>
              <span className="text-xs text-[var(--text-muted)]">{new Date(domain.lastVerifiedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="border border-[var(--rail)]" padding="lg">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Health Checks</h2>
        {health ? (
          <div className="space-y-2.5">
            {[
              { label: 'DNS', ok: health.dnsOk, pts: 30 },
              { label: 'Routing', ok: health.routingOk, pts: 20 },
              { label: 'SSL', ok: health.sslOk, pts: 30 },
              { label: 'Email', ok: health.emailOk, pts: 20 },
            ].map(({ label, ok, pts }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">{label} <span className="text-xs">(+{pts})</span></span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                  {ok ? '✓' : '✗'}
                </span>
              </div>
            ))}
            {health.responseTimeMs !== null && (
              <div className="pt-1 text-xs text-[var(--text-dim)] border-t border-[var(--rail)] mt-2">
                Response: {health.responseTimeMs}ms
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No health data yet.</p>
        )}
      </Card>
    </div>
  );
}
