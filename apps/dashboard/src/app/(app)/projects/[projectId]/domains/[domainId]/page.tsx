'use client';

import type { Domain, DomainHealth, DnsRecord } from '@fidscript/sdk';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Badge, Spinner, Toast, Modal } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

type Tab = 'overview' | 'dns' | 'health' | 'email';

const STATUS_COLORS: Record<string, string> = {
  ok:       'bg-emerald-900 text-[var(--success)]',
  degraded: 'bg-yellow-900 text-yellow-400',
  broken:   'bg-red-900 text-[var(--danger)]',
  pending:  'bg-[var(--rail)] text-[var(--text-muted)]',
  missing:  'bg-red-900 text-[var(--danger)]',
  ACTIVE:   'bg-emerald-900 text-[var(--success)]',
  PENDING:  'bg-[var(--rail)] text-[var(--text-muted)]',
  BROKEN:   'bg-red-900 text-[var(--danger)]',
  VALIDATING: 'bg-blue-900 text-[var(--accent)]',
};

function healthScore(health: DomainHealth | null): number {
  if (!health) return 0;
  const checks = [health.dnsOk, health.routingOk, health.sslOk];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded border border-[var(--rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

export default function DomainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const domainId = params.domainId as string;
  const { getSdk } = useAuth();

  const [domain, setDomain] = useState<Domain | null>(null);
  const [health, setHealth] = useState<DomainHealth | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dns');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [autoConfiguring, setAutoConfiguring] = useState(false);
  const [showAutoConfigModal, setShowAutoConfigModal] = useState(false);
  const healthPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load domain + health + DNS records ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const sdk = getSdk();
      const [domainData, healthData, dnsData] = await Promise.all([
        sdk.domains.get(domainId).catch(() => null),
        sdk.domains.getHealth(projectId, domainId).catch(() => null),
        sdk.domains.getDnsRecords(projectId, domainId).catch(() => null),
      ]);
      if (!domainData) {
        setError('Domain not found');
        return;
      }
      setDomain(domainData as Domain);
      setHealth(healthData as DomainHealth | null);
      if (dnsData) {
        const d = dnsData as { records?: DnsRecord[] };
        setDnsRecords(d.records ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain');
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId, domainId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Health polling while checking ───────────────────────────────────────────
  function startHealthPolling() {
    if (healthPollingRef.current) clearTimeout(healthPollingRef.current);
    let attempts = 0;
    function poll() {
      if (attempts >= 20) return; // 20 × 3s = 60s max
      attempts++;
      getSdk().domains.getHealth(projectId, domainId)
        .then((result: unknown) => {
          const h = result as DomainHealth | null;
          if (h && h.status !== 'degraded') {
            setHealth(h);
            setCheckingHealth(false);
            return;
          }
          healthPollingRef.current = setTimeout(poll, 3000);
        })
        .catch(() => {
          healthPollingRef.current = setTimeout(poll, 3000);
        });
    }
    healthPollingRef.current = setTimeout(poll, 3000);
  }

  // ── Trigger health check ───────────────────────────────────────────────────
  async function handleHealthCheck() {
    setCheckingHealth(true);
    try {
      await getSdk().domains.triggerHealthCheck(projectId, domainId);
      startHealthPolling();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Health check failed', type: 'error' });
      setCheckingHealth(false);
    }
  }

  // ── Auto-configure DNS ─────────────────────────────────────────────────────
  async function handleAutoConfigure() {
    setAutoConfiguring(true);
    try {
      await getSdk().domains.autoConfigureDnsRecords(projectId, domainId);
      setToast({ message: 'DNS records auto-configured via Cloudflare', type: 'success' });
      setShowAutoConfigModal(false);
      await loadAll();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Auto-configure failed', type: 'error' });
    } finally {
      setAutoConfiguring(false);
    }
  }

  const score = healthScore(health);
  const scoreColor = score >= 90 ? 'text-[var(--success)]' : score >= 60 ? 'text-yellow-400' : 'text-[var(--danger)]';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !domain) {
    return (
      <div className="p-6">
        <p className="text-[var(--danger)] text-sm">{error ?? 'Domain not found'}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'dns', label: 'DNS Records' },
    { id: 'health', label: 'Health' },
    { id: 'email', label: 'Email' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Link
          href={`/projects/${projectId}/domains`}
          className="mt-1 text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--text)] truncate">{domain.domain}</h1>
            <Badge variant={domain.dnsStatus === 'ACTIVE' ? 'success' : domain.dnsStatus === 'BROKEN' ? 'danger' : 'default'}>
              {domain.dnsStatus ?? 'PENDING'}
            </Badge>
            <Badge variant={domain.sslStatus === 'ACTIVE' ? 'success' : domain.sslStatus === 'PENDING' ? 'default' : 'danger'}>
              SSL: {domain.sslStatus ?? 'PENDING'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--text-muted)]">
            {health && (
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-lg ${scoreColor}`}>{score}</span>
                <span>/100 health</span>
              </div>
            )}
            <span>{domain.dnsMode === 'cloudflare_auto' ? 'Cloudflare Auto-DNS' : 'Manual DNS'}</span>
            {domain.sslExpiresAt && (
              <span>SSL expires {new Date(domain.sslExpiresAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'health' && (
            <Button
              variant="secondary"
              size="sm"
              loading={checkingHealth}
              onClick={handleHealthCheck}
            >
              {checkingHealth ? 'Checking…' : 'Re-check'}
            </Button>
          )}
          {domain.dnsMode === 'cloudflare_auto' && activeTab === 'dns' && (
            <Button
              variant="secondary"
              size="sm"
              loading={autoConfiguring}
              onClick={() => setShowAutoConfigModal(true)}
            >
              Auto-configure
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[var(--rail)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--accent)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            } bg-none border-none cursor-pointer`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-[var(--rail)]" padding="lg">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Domain Info</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ['Domain ID', domain.id],
                ['Project ID', domain.projectId],
                ['DNS Mode', domain.dnsMode],
                ['SSL Status', domain.sslStatus],
                ['DNS Status', domain.dnsStatus],
                ['Apex Domain', domain.apexDomain ? 'Yes' : 'No'],
                ['Primary', domain.isPrimary ? 'Yes' : 'No'],
                ['DNS Verified', domain.dnsVerifiedAt ? new Date(domain.dnsVerifiedAt).toLocaleDateString() : 'No'],
                ['Created', new Date(domain.createdAt).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <dt className="text-[var(--text-muted)] w-36 shrink-0">{label}</dt>
                  <dd className="text-[var(--text)] font-mono text-xs">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="border border-[var(--rail)]" padding="lg">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Health Summary</h2>
            {health ? (
              <div className="space-y-3">
                {[
                  { label: 'DNS Propagation', ok: health.dnsOk },
                  { label: 'HTTP Routing', ok: health.routingOk },
                  { label: 'SSL Certificate', ok: health.sslOk },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">{label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-900 text-[var(--success)]' : 'bg-red-900 text-[var(--danger)]'}`}>
                      {ok ? '✓ OK' : '✗ Failed'}
                    </span>
                  </div>
                ))}
                {health.sslExpiresInDays !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">SSL Expires In</span>
                    <span className={`text-xs ${health.sslExpiresInDays < 30 ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                      {health.sslExpiresInDays} days
                    </span>
                  </div>
                )}
                {health.responseTimeMs !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Response Time</span>
                    <span className="text-[var(--text-muted)] text-xs">{health.responseTimeMs}ms</span>
                  </div>
                )}
                {health.errorMessage && (
                  <div className="rounded border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-xs text-[var(--danger)]">
                    {health.errorMessage}
                  </div>
                )}
                <div className="text-xs text-[var(--text-dim)]">
                  Last checked: {new Date(health.checkedAt).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No health data yet. Run a health check to see results.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── DNS Records ──────────────────────────────────────────────────── */}
      {activeTab === 'dns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              Required DNS records for this domain. Records marked{" "}
              <span className="text-[var(--success)]">✓ OK</span> are confirmed propagating.
              <span className="text-[var(--danger)]"> ✗ Missing</span> need to be added at your DNS provider.
            </p>
          </div>

          {dnsRecords.length === 0 ? (
            <Card className="border border-[var(--rail)]" padding="lg">
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No DNS records available.</p>
            </Card>
          ) : (
            <div className="rounded-lg border border-[var(--rail)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Type</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Name</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Value</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5 hidden lg:table-cell">TTL</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5 hidden md:table-cell">Category</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((rec, i) => {
                    const statusClass =
                      rec.status === 'ok' ? 'bg-emerald-900 text-[var(--success)]' :
                      rec.status === 'missing' ? 'bg-red-900 text-[var(--danger)]' :
                      'bg-[var(--rail)] text-[var(--text-muted)]';
                    const categoryBadge: Record<string, string> = {
                      deployment: 'bg-blue-900 text-blue-300',
                      email: 'bg-purple-900 text-purple-300',
                      verification: 'bg-yellow-900 text-yellow-400',
                    };
                    return (
                      <tr key={i} className="border-b border-[var(--rail)] last:border-0 hover:bg-[var(--surface-2)]/50">
                        <td className="px-4 py-3">
                          <Badge variant="default" className="font-mono">{rec.type}</Badge>
                          {rec.priority !== undefined && (
                            <span className="text-xs text-[var(--text-dim)] ml-1">{rec.priority}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text)] max-w-[200px] truncate">{rec.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-[280px] truncate">
                          <span title={rec.value}>{rec.value}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell">{rec.ttl ?? 300}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryBadge[rec.category] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                            {rec.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusClass}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <CopyButton text={`${rec.type}  ${rec.name}  ${rec.value}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Health ───────────────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'DNS Propagation', ok: health?.dnsOk, description: 'Domain resolves correctly via public DNS' },
              { label: 'HTTP Routing', ok: health?.routingOk, description: 'HTTP/HTTPS requests reach the server' },
              { label: 'SSL Certificate', ok: health?.sslOk, description: 'Valid TLS certificate is present' },
            ].map(({ label, ok, description }) => (
              <Card key={label} className={`border ${ok === true ? 'border-[var(--success)]/30' : ok === false ? 'border-[var(--danger)]/30' : 'border-[var(--rail)]'}`} padding="lg">
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
      )}

      {/* ── Email ───────────────────────────────────────────────────────── */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <Card className="border border-[var(--rail)]" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">Email Configuration</h2>
              <Link href={`/projects/${projectId}/email`}>
                <Button variant="ghost" size="sm">Manage Email</Button>
              </Link>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              To enable sending and receiving email for <strong className="text-[var(--text)]">{domain.domain}</strong>,
              configure the email DNS records in the DNS Records tab above.
            </p>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'MX Records', hint: 'Routes incoming mail to the mail server', done: dnsRecords.some(r => r.type === 'MX' && r.status === 'ok') },
                { label: 'SPF Record', hint: 'Authorizes sending servers', done: dnsRecords.some(r => r.type === 'TXT' && r.name === '@' && r.value.includes('spf1') && r.status === 'ok') },
                { label: 'DKIM Record', hint: 'Email cryptographic signature', done: dnsRecords.some(r => r.type === 'TXT' && r.name.includes('_domainkey') && r.status === 'ok') },
                { label: 'DMARC Record', hint: 'Policy for unauthenticated mail', done: dnsRecords.some(r => r.type === 'TXT' && r.name === '_dmarc' && r.status === 'ok') },
              ].map(({ label, hint, done }) => (
                <div key={label} className="flex items-center justify-between rounded border border-[var(--rail)] px-3 py-2.5">
                  <div>
                    <p className="text-[var(--text)] text-sm font-medium">{label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{hint}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${done ? 'bg-emerald-900 text-[var(--success)]' : 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                    {done ? '✓ Configured' : '✗ Not configured'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Placeholder deliverability stats */}
          <Card className="border border-[var(--rail)]" padding="lg">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Deliverability Insights</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Reputation', value: '—', sub: 'Not enough data' },
                { label: 'Bounce Rate', value: '—', sub: 'No sends yet' },
                { label: 'Complaint Rate', value: '—', sub: 'No sends yet' },
                { label: 'Inbox Placement', value: '—', sub: 'No sends yet' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">{label}</p>
                  <p className="text-xs text-[var(--text-dim)]">{sub}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-dim)] mt-4">
              Deliverability insights are populated after sending emails through this domain.
              Configure email DNS records above to start sending.
            </p>
          </Card>
        </div>
      )}

      {/* ── Auto-configure Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showAutoConfigModal}
        onClose={() => setShowAutoConfigModal(false)}
        title="Auto-configure DNS Records"
        size="sm"
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          This will create all required DNS records for <strong className="text-[var(--text)]">{domain.domain}</strong> via the Cloudflare API.
          Existing records will not be overwritten.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowAutoConfigModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" loading={autoConfiguring} onClick={handleAutoConfigure}>
            {autoConfiguring ? 'Configuring…' : 'Configure Records'}
          </Button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
