'use client';

import { useRef, useState } from 'react';
import { Button, Input, Modal, Spinner, Badge } from '@fidscript/ui';
import type { Domain, DnsConnection, DomainType } from '@fidscript-deploy/sdk';

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
  suggestedMode: 'cloudflare_auto' | 'manual';
}

interface AddDomainModalHandlerProps {
  projectId: string;
  connection: DnsConnection | null;
  // Add modal
  isAddOpen: boolean;
  onAddDomain: (domain: string, mode: 'manual' | 'cloudflare_auto', types: DomainType[]) => Promise<void>;
  onCloseAdd: () => void;
  // Connect modal
  isConnectOpen: boolean;
  onConnectCloudflareOAuth: () => Promise<void>;
  onConnectCloudflareToken: (token: string) => Promise<void>;
  onCloseConnect: () => void;
  // Instructions panel
  selectedDomain: Domain | null;
  onShowInstructions: (domain: Domain) => void;
  onCloseInstructions: () => void;
  getSdk: () => any;
}

export function AddDomainModalHandler({
  projectId,
  connection,
  isAddOpen,
  onAddDomain,
  onCloseAdd,
  isConnectOpen,
  onConnectCloudflareOAuth,
  onConnectCloudflareToken,
  onCloseConnect,
  selectedDomain,
  onShowInstructions,
  onCloseInstructions,
  getSdk,
}: AddDomainModalHandlerProps) {
  const [newDomain, setNewDomain] = useState('');
  const [dnsMode, setDnsMode] = useState<'manual' | 'cloudflare_auto'>('manual');
  const [newDomainTypes, setNewDomainTypes] = useState<DomainType[]>(['DEPLOYMENT']);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dnsDetection, setDnsDetection] = useState<DnsDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cfToken, setCfToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<'oauth' | 'token'>('oauth');

  const [instructions, setInstructions] = useState<any[]>([]);
  const [loadingInstructions, setLoadingInstructions] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      if (dnsMode === 'cloudflare_auto' && !connection) {
        onCloseAdd();
        onConnectCloudflareOAuth();
        return;
      }
      await onAddDomain(newDomain.trim(), dnsMode, newDomainTypes);
      setNewDomain('');
      setNewDomainTypes(['DEPLOYMENT']);
      setDnsDetection(null);
      onCloseAdd();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  async function handleConnectCloudflareOAuth() {
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnectCloudflareOAuth();
      onCloseConnect();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to start OAuth');
    } finally {
      setConnecting(false);
    }
  }

  async function handleConnectCloudflare(e: React.FormEvent) {
    e.preventDefault();
    if (!cfToken.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnectCloudflareToken(cfToken.trim());
      setCfToken('');
      onCloseConnect();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect Cloudflare');
    } finally {
      setConnecting(false);
    }
  }

  async function loadInstructions(domain: Domain) {
    onShowInstructions(domain);
    setLoadingInstructions(true);
    setInstructions([]);
    try {
      const sdk = getSdk();
      const data = await sdk.domains.getInstructions(projectId, domain.id);
      setInstructions(data.instructions ?? []);
    } catch {
      setInstructions([]);
    } finally {
      setLoadingInstructions(false);
    }
  }

  async function handleDetectDns(domainName: string) {
    if (!domainName.trim() || domainName.length < 4) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const sdk = getSdk();
        const result = await sdk.domains.detectDnsProvider(projectId, domainName.trim()) as DnsDetection;
        setDnsDetection(result);
        if (result.provider === 'cloudflare' && dnsMode === 'manual') setDnsMode('cloudflare_auto');
      } catch {
        setDnsDetection(null);
      } finally {
        setDetecting(false);
      }
    }, 600);
  }

  // Expose open helpers via callbacks passed from parent
  // The parent passes onOpenAdd, onOpenConnect, onOpenInstructions
  // Here we just render the modals

  return (
    <>
      {/* ── Add Domain Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => { onCloseAdd(); setNewDomain(''); setNewDomainTypes(['DEPLOYMENT']); setAddError(null); setDnsDetection(null); }}
        title="Add Domain"
        size="md"
      >
        <form onSubmit={handleAdd} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Domain name</label>
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onBlur={() => handleDetectDns(newDomain)}
              placeholder="example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full"
            />
            {detecting && <p className="text-xs text-[var(--text-dim)] mt-1">Detecting DNS provider...</p>}
          </div>

          <div className="mb-5">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">DNS mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(['manual', 'cloudflare_auto'] as const).map(mode => (
                <label
                  key={mode}
                  className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${
                    dnsMode === mode ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--rail)] hover:border-[var(--text-dim)]'
                  }`}
                >
                  <input type="radio" name="dnsMode" value={mode} checked={dnsMode === mode}
                    onChange={() => setDnsMode(mode)} className="sr-only" />
                  <span className="text-sm font-medium text-[var(--text)]">
                    {mode === 'manual' ? 'Manual DNS' : 'Cloudflare Auto'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {mode === 'manual' ? 'I will add records myself' : 'Automatic DNS via API'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Domain purpose</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'DEPLOYMENT', label: 'Deployment' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'INBOUND_EMAIL', label: 'Inbound' },
                { value: 'TRACKING', label: 'Tracking' },
                { value: 'API', label: 'API' },
                { value: 'REDIRECT', label: 'Redirect' },
                { value: 'SANDBOX', label: 'Sandbox' },
              ] as const).map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-xs ${
                    newDomainTypes.includes(value)
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]'
                      : 'border-[var(--rail)] hover:border-[var(--text-dim)] text-[var(--text-muted)]'
                  }`}
                >
                  <input type="checkbox" className="sr-only"
                    checked={newDomainTypes.includes(value)}
                    onChange={() => setNewDomainTypes(prev =>
                      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value],
                    )} />
                  {label}
                </label>
              ))}
            </div>
            {newDomainTypes.length === 0 && <p className="text-xs text-[var(--danger)] mt-1">Select at least one purpose.</p>}
          </div>

          {dnsDetection?.provider === 'cloudflare' && (
            <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">☁️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-300">Cloudflare detected</p>
                  <p className="text-xs text-blue-200/70 mt-0.5">
                    This domain uses Cloudflare DNS. Connect your Cloudflare account to enable one-click configuration.
                  </p>
                  {dnsDetection.nameservers.length > 0 && (
                    <p className="text-xs text-blue-200/50 mt-1 font-mono">
                      NS: {dnsDetection.nameservers.slice(0, 2).join(', ')}
                      {dnsDetection.nameservers.length > 2 ? ` +${dnsDetection.nameservers.length - 2}` : ''}
                    </p>
                  )}
                </div>
                {!connection && (
                  <Button variant="primary" size="sm" onClick={() => { onCloseAdd(); /* parent opens connect */ }}>
                    Connect Cloudflare
                  </Button>
                )}
                {connection && dnsDetection.autoConfigurationAvailable && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><span>✓</span> Ready to auto-configure</span>
                )}
              </div>
            </div>
          )}

          {dnsDetection && dnsDetection.provider !== 'cloudflare' && dnsDetection.provider !== 'unknown' && dnsDetection.nameservers.length > 0 && (
            <div className="mb-4 rounded-lg border border-[var(--rail)] bg-[var(--surface-2)]/50 px-3 py-2.5">
              <p className="text-xs text-[var(--text-muted)]">
                DNS provider detected: <span className="capitalize">{dnsDetection.provider}</span>. We recommend Manual DNS mode.
              </p>
            </div>
          )}

          {dnsMode === 'cloudflare_auto' && !connection && !dnsDetection && (
            <div className="mb-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2.5 text-xs text-[var(--warning)]">
              Connect Cloudflare first — you&apos;ll be asked for your API token after clicking Add.
            </div>
          )}

          {addError && <p className="text-[var(--danger)] text-xs mb-4">{addError}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => { onCloseAdd(); setAddError(null); }}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={adding}>
              {adding ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Connect Cloudflare Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={isConnectOpen}
        onClose={() => { onCloseConnect(); setCfToken(''); setConnectError(null); }}
        title="Connect Cloudflare"
        size="md"
      >
        <div className="flex gap-1 mb-4 border-b border-[var(--rail)]">
          {[{ id: 'oauth', label: '☁️ OAuth (Recommended)' }, { id: 'token', label: '🔑 API Token' }].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setConnectMode(tab.id as 'oauth' | 'token'); setConnectError(null); }}
              className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
                connectMode === tab.id ? 'border-[var(--accent)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              } bg-none cursor-pointer`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {connectMode === 'oauth' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Authorize FIDScript to manage DNS records in your Cloudflare account.
            </p>
            <div className="rounded-lg border border-[var(--rail)] p-3 space-y-1.5">
              {['Zone:Read', 'DNS:Edit', 'Account:Read'].map(perm => (
                <p key={perm} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--success)]">✓</span> {perm}
                </p>
              ))}
            </div>
            {connectError && <p className="text-[var(--danger)] text-xs">{connectError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onCloseConnect}>Cancel</Button>
              <Button variant="primary" size="sm" loading={connecting} onClick={handleConnectCloudflareOAuth}>
                {connecting ? 'Redirecting...' : 'Connect with Cloudflare'}
              </Button>
            </div>
          </div>
        )}

        {connectMode === 'token' && (
          <form onSubmit={handleConnectCloudflare} noValidate>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Enter a Cloudflare API token with <strong>Zone:Read</strong> and <strong>DNS:Edit</strong> permissions.
            </p>
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">API Token</label>
              <Input type="password" value={cfToken} onChange={e => setCfToken(e.target.value)}
                placeholder="cfut_..."
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)] w-full font-mono" />
            </div>
            <div className="mb-5 rounded-lg border border-[var(--rail)] p-3">
              <p className="text-xs text-[var(--text-muted)] mb-2">Required permissions:</p>
              <ul className="text-xs text-[var(--text-muted)] space-y-1">
                <li className="flex items-center gap-2"><span className="text-[var(--success)]">✓</span> Zone:Read</li>
                <li className="flex items-center gap-2"><span className="text-[var(--success)]">✓</span> DNS:Edit</li>
              </ul>
            </div>
            {connectError && <p className="text-[var(--danger)] text-xs mb-4">{connectError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onCloseConnect}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" loading={connecting}>
                {connecting ? 'Connecting...' : 'Connect Cloudflare'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── DNS Instructions Panel ───────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedDomain}
        onClose={onCloseInstructions}
        title={`DNS Setup — ${selectedDomain?.domain ?? ''}`}
        size="lg"
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Add the following DNS records at your registrar or DNS provider to verify ownership
          and route traffic for <strong className="text-[var(--text)]">{selectedDomain?.domain}</strong>.
        </p>

        {loadingInstructions ? (
          <div className="flex items-center justify-center py-8"><Spinner size="md" /></div>
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
                    <td className="px-4 py-2.5"><Badge variant="default">{rec.type}</Badge></td>
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
          <Button variant="ghost" size="sm" onClick={onCloseInstructions}>Close</Button>
        </div>
      </Modal>
    </>
  );
}
