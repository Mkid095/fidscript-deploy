'use client';

import { useState, useRef } from 'react';
import { Button, Input, Modal } from '@fidscript/ui';
import type { DomainType } from '@fidscript-deploy/sdk';

interface DnsDetection {
  provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
  nameservers: string[];
  autoConfigurationAvailable: boolean;
  suggestedMode: 'cloudflare_auto' | 'manual';
}

interface AddDomainModalProps {
  projectId: string;
  connection: any | null;
  isOpen: boolean;
  onAdd: (domain: string, mode: 'manual' | 'cloudflare_auto', types: DomainType[]) => Promise<void>;
  onClose: () => void;
  onOpenConnect: () => void;
  getDnsDetection: (projectId: string, domain: string) => Promise<DnsDetection | null>;
}

export function AddDomainModal({
  projectId,
  connection,
  isOpen,
  onAdd,
  onClose,
  onOpenConnect,
  getDnsDetection,
}: AddDomainModalProps) {
  const [newDomain, setNewDomain] = useState('');
  const [dnsMode, setDnsMode] = useState<'manual' | 'cloudflare_auto'>('manual');
  const [newDomainTypes, setNewDomainTypes] = useState<DomainType[]>(['DEPLOYMENT']);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dnsDetection, setDnsDetection] = useState<DnsDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      if (dnsMode === 'cloudflare_auto' && !connection) {
        onClose();
        onOpenConnect();
        return;
      }
      await onAdd(newDomain.trim(), dnsMode, newDomainTypes);
      setNewDomain('');
      setNewDomainTypes(['DEPLOYMENT']);
      setDnsDetection(null);
      onClose();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  }

  async function handleDetectDns(domainName: string) {
    if (!domainName.trim() || domainName.length < 4) return;
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(async () => {
      setDetecting(true);
      try {
        const result = await getDnsDetection(projectId, domainName.trim());
        setDnsDetection(result);
        if (result?.provider === 'cloudflare' && dnsMode === 'manual') setDnsMode('cloudflare_auto');
      } catch {
        setDnsDetection(null);
      } finally {
        setDetecting(false);
      }
    }, 600);
  }

  function reset() {
    setNewDomain('');
    setNewDomainTypes(['DEPLOYMENT']);
    setAddError(null);
    setDnsDetection(null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); reset(); }}
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
                <Button variant="primary" size="sm" onClick={() => { onClose(); onOpenConnect(); }}>
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
          <Button variant="ghost" size="sm" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" loading={adding}>
            {adding ? 'Adding...' : 'Add Domain'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
