'use client';

import type { Domain, DnsConnection } from '@fidscript/sdk';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Input, Modal, Spinner, EmptyState, Toast, Badge } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';

// ─── Status badge helpers ─────────────────────────────────────────────────────

type DnsStatus = Domain['dnsStatus'];
type SslStatus = Domain['sslStatus'];

function dnsVariant(s: DnsStatus): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (s?.toUpperCase()) {
    case 'ACTIVE':         return 'success';
    case 'TLS_PENDING':    return 'info';
    case 'VALIDATING':     return 'info';
    case 'OWNERSHIP_PENDING': return 'warning';
    case 'PENDING':        return 'default';
    case 'FAILED':
    case 'BROKEN':         return 'danger';
    default:               return 'default';
  }
}

function sslVariant(s: SslStatus): 'default' | 'warning' | 'success' | 'danger' | 'info' {
  switch (s?.toUpperCase()) {
    case 'ACTIVE':   return 'success';
    case 'ISSUING':  return 'info';
    case 'PENDING':  return 'default';
    case 'FAILED':
    case 'BROKEN':   return 'danger';
    default:         return 'default';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DomainsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { getSdk } = useAuth();

  const [domains, setDomains]   = useState<Domain[]>([]);
  const [connection, setConnection] = useState<DnsConnection | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Add domain modal
  const [showAdd, setShowAdd]         = useState(false);
  const [newDomain, setNewDomain]     = useState('');
  const [dnsMode, setDnsMode]         = useState<'manual' | 'cloudflare_auto'>('manual');
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState<string | null>(null);

  // Cloudflare connect modal
  const [showConnect, setShowConnect] = useState(false);
  const [cfToken, setCfToken]         = useState('');
  const [connecting, setConnecting]   = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Domain detail panel (instructions)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [instructions, setInstructions]     = useState<any[]>([]);
  const [loadingInstructions, setLoadingInstructions] = useState(false);

  // Verify / delete
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [toast, setToast]             = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Load domains + connection ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sdk = getSdk();
      const [domainList, conn] = await Promise.all([
        sdk.domains.list(projectId),
        sdk.domains.getConnection(projectId),
      ]);
      setDomains(domainList ?? []);
      setConnection(conn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => { load(); }, [load]);

  // ── Add domain ──────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const sdk = getSdk();
      // If cloudflare_auto mode but no connection yet, force user to connect first
      if (dnsMode === 'cloudflare_auto' && !connection) {
        setShowAdd(false);
        setShowConnect(true);
        return;
      }
      const created = await sdk.domains.create(projectId, newDomain.trim(), dnsMode);
      setDomains(prev => [...prev, created as Domain]);
      setNewDomain('');
      setShowAdd(false);
      setToast({ message: `Domain "${newDomain.trim()}" added`, type: 'success' });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  // ── Connect Cloudflare ──────────────────────────────────────────────────────
  async function handleConnectCloudflare(e: React.FormEvent) {
    e.preventDefault();
    if (!cfToken.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const sdk = getSdk();
      const conn = await sdk.domains.connectCloudflare(projectId, cfToken.trim());
      setConnection(conn);
      setCfToken('');
      setShowConnect(false);
      setToast({ message: 'Cloudflare connected successfully', type: 'success' });
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect Cloudflare');
    } finally {
      setConnecting(false);
    }
  }

  // ── Load instructions for a domain ─────────────────────────────────────────
  async function showInstructions(domain: Domain) {
    setSelectedDomain(domain);
    setLoadingInstructions(true);
    setInstructions([]);
    try {
      const sdk = getSdk();
      const data = await sdk.domains.getInstructions(projectId, domain.id);
      setInstructions(data.instructions ?? []);
    } catch {
      // instructions may not be available for cloudflare_auto domains
      setInstructions([]);
    } finally {
      setLoadingInstructions(false);
    }
  }

  // ── Verify domain ───────────────────────────────────────────────────────────
  async function handleVerify(domain: Domain) {
    setVerifyingId(domain.id);
    try {
      const sdk = getSdk();
      const updated = await sdk.domains.verify(domain.id) as Domain;
      setDomains(prev => prev.map(d => d.id === updated.id ? updated : d));
      setToast({ message: `Verification complete for ${domain.domain}`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Verification failed', type: 'error' });
    } finally {
      setVerifyingId(null);
    }
  }

  // ── Delete domain ───────────────────────────────────────────────────────────
  async function handleDelete(domain: Domain) {
    if (!confirm(`Remove "${domain.domain}" from this project? This cannot be undone.`)) return;
    try {
      const sdk = getSdk();
      await sdk.domains.delete(domain.id);
      setDomains(prev => prev.filter(d => d.id !== domain.id));
      if (selectedDomain?.id === domain.id) setSelectedDomain(null);
      setToast({ message: `Domain "${domain.domain}" removed`, type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete domain', type: 'error' });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Domains</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} &middot;{' '}
            {connection
              ? <span className="text-[var(--success)]">Cloudflare connected</span>
              : <span>No DNS provider</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!connection && (
            <Button variant="secondary" size="sm" onClick={() => setShowConnect(true)}>
              Connect Cloudflare
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            Add Domain
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Cloudflare connection banner */}
      {connection && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3">
          <svg className="w-4 h-4 text-[var(--success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium text-[var(--success)]">Cloudflare</span>
            <span className="text-sm text-[var(--text-muted)] ml-2">
              {connection.email ? `${connection.email} · ` : ''}Auto-DNS enabled
            </span>
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline"
          >
            Change
          </button>
        </div>
      )}

      {/* Domain list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-48">
          <Spinner size="lg" />
        </div>
      ) : domains.length === 0 ? (
        <EmptyState
          title="No domains yet"
          description="Add a custom domain or connect Cloudflare to enable auto-DNS."
          action={
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" size="sm" onClick={() => setShowConnect(true)}>
                Connect Cloudflare
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
                Add Domain
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {domains.map(domain => (
            <Card
              key={domain.id}
              className="border border-[var(--rail)] p-0 overflow-hidden"
              padding="none"
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text)] truncate">{domain.domain}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">
                      {domain.dnsMode === 'cloudflare_auto' ? 'Cloudflare Auto' : 'Manual DNS'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <Badge variant={dnsVariant(domain.dnsStatus)}>
                      {domain.dnsStatus ?? 'PENDING'}
                    </Badge>
                  </div>
                </div>

                {/* Status row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-muted)]">DNS</span>
                    <Badge variant={dnsVariant(domain.dnsStatus)}>
                      {domain.dnsStatus ?? 'PENDING'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--text-muted)]">SSL</span>
                    <Badge variant={sslVariant(domain.sslStatus)}>
                      {domain.sslStatus ?? 'PENDING'}
                    </Badge>
                  </div>
                  {domain.isPrimary && (
                    <Badge variant="info">Primary</Badge>
                  )}
                  {domain.apexDomain && (
                    <Badge variant="default">Apex</Badge>
                  )}
                </div>

                {/* Timestamps */}
                {(domain.dnsVerifiedAt || domain.routingVerifiedAt) && (
                  <div className="text-xs text-[var(--text-muted)] mb-4 space-y-0.5">
                    {domain.dnsVerifiedAt && (
                      <p>DNS verified: {new Date(domain.dnsVerifiedAt).toLocaleDateString()}</p>
                    )}
                    {domain.routingVerifiedAt && (
                      <p>Routing verified: {new Date(domain.routingVerifiedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Card footer actions */}
              <div className="border-t border-[var(--rail)] px-4 py-3 flex items-center gap-2 bg-[var(--surface-2)]">
                {domain.dnsMode === 'manual' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => showInstructions(domain)}
                  >
                    DNS Instructions
                  </Button>
                )}
                <div className="flex-1" />
                {(domain.dnsStatus === 'PENDING' || domain.dnsStatus === 'OWNERSHIP_PENDING' || domain.dnsStatus === 'VALIDATING') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={verifyingId === domain.id}
                    onClick={() => handleVerify(domain)}
                  >
                    Verify
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--danger)] hover:text-[var(--danger)]"
                  onClick={() => handleDelete(domain)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add Domain Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setNewDomain(''); setAddError(null); }}
        title="Add Domain"
        size="md"
      >
        <form onSubmit={handleAdd} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Domain name</label>
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">DNS mode</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                  dnsMode === 'manual'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--rail)] hover:border-[var(--text-dim)]'
                }`}
              >
                <input
                  type="radio"
                  name="dnsMode"
                  value="manual"
                  checked={dnsMode === 'manual'}
                  onChange={() => setDnsMode('manual')}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-[var(--text)]">Manual DNS</span>
                <span className="text-xs text-[var(--text-muted)]">I will add records myself</span>
              </label>
              <label
                className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                  dnsMode === 'cloudflare_auto'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                    : 'border-[var(--rail)] hover:border-[var(--text-dim)]'
                }`}
              >
                <input
                  type="radio"
                  name="dnsMode"
                  value="cloudflare_auto"
                  checked={dnsMode === 'cloudflare_auto'}
                  onChange={() => setDnsMode('cloudflare_auto')}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-[var(--text)]">Cloudflare Auto</span>
                <span className="text-xs text-[var(--text-muted)]">Automatic DNS via API</span>
              </label>
            </div>
          </div>

          {dnsMode === 'cloudflare_auto' && !connection && (
            <div className="mb-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2.5 text-xs text-[var(--warning)]">
              Connect Cloudflare first — you&apos;ll be asked for your API token after clicking Add.
            </div>
          )}

          {addError && (
            <p className="text-[var(--danger)] text-xs mb-4">{addError}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setShowAdd(false); setAddError(null); }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={adding}>
              {adding ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Connect Cloudflare Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showConnect}
        onClose={() => { setShowConnect(false); setCfToken(''); setConnectError(null); }}
        title="Connect Cloudflare"
        size="md"
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Enter a Cloudflare API token with <strong>Zone:Read</strong> and <strong>DNS:Edit</strong> permissions.
          Your token is encrypted and stored securely — we never store the plaintext.
        </p>

        <form onSubmit={handleConnectCloudflare} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">API Token</label>
            <Input
              type="password"
              value={cfToken}
              onChange={e => setCfToken(e.target.value)}
              placeholder="cfut_..."
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full font-mono"
            />
          </div>

          <div className="mb-5 rounded-lg border border-[var(--rail)] p-3">
            <p className="text-xs text-[var(--text-muted)] mb-2">Required permissions:</p>
            <ul className="text-xs text-[var(--text-muted)] space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-[var(--success)]">✓</span> Zone:Read
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[var(--success)]">✓</span> DNS:Edit
              </li>
            </ul>
          </div>

          {connectError && (
            <p className="text-[var(--danger)] text-xs mb-4">{connectError}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setShowConnect(false); setConnectError(null); }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={connecting}>
              {connecting ? 'Connecting...' : 'Connect Cloudflare'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DNS Instructions Panel ────────────────────────────────────────── */}
      {selectedDomain && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDomain(null)}
          title={`DNS Setup — ${selectedDomain.domain}`}
          size="lg"
        >
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Add the following DNS records at your registrar or DNS provider to verify ownership
            and route traffic for <strong className="text-[var(--text)]">{selectedDomain.domain}</strong>.
          </p>

          {loadingInstructions ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : instructions.length > 0 ? (
            <div className="rounded-lg border border-[var(--rail)] overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--rail)] bg-[var(--surface-2)]">
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Type</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Name</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2">Value</th>
                    <th className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-2 hidden md:table-cell">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {instructions.map((rec: any, i: number) => (
                    <tr key={i} className="border-b border-[var(--rail)] last:border-0">
                      <td className="px-4 py-2.5">
                        <Badge variant="default">{rec.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--text)]">{rec.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{rec.value}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] hidden md:table-cell">{rec.ttl ?? 300}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mb-4">No instructions available for this domain.</p>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDomain(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

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