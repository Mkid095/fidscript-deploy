'use client';

import { useEffect, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { HealthRow } from '../components/health-row';

interface DiscoveryResult {
  serverIp: string;
  adminEmail: string | null;
  dockerAvailable: boolean;
  traefikConfigured: boolean;
  cloudflareTokenFound: boolean;
  existingCertificateFound: boolean;
}

interface Check {
  id: string;
  label: string;
  ok: boolean | null;
  detail?: string;
}

interface DiscoveryStepProps {
  onComplete: (data: { serverIp: string; adminEmail: string }) => void;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `${window.location.protocol}//${window.location.host}`;
}

export function DiscoveryStep({ onComplete }: DiscoveryStepProps) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [serverIpManual, setServerIpManual] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [discoveredData, setDiscoveredData] = useState<{ serverIp: string; adminEmail: string } | null>(null);

  useEffect(() => {
    async function runDiscovery() {
      setDiscoveryError(null);
      setChecks([
        { id: 'server', label: 'Server IP: …', ok: null },
        { id: 'docker', label: 'Docker available', ok: null },
        { id: 'cloudflare', label: 'Cloudflare token', ok: null },
        { id: 'traefik', label: 'Traefik configured', ok: null },
        { id: 'certificate', label: 'SSL certificate', ok: null },
      ]);

      try {
        const res = await fetch(`${getApiBase()}/api/v1/installation/discover`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DiscoveryResult = await res.json();

        const resolvedIp = serverIpManual ? manualIp : (data.serverIp ?? '');
        const ipOk = serverIpManual || (resolvedIp && resolvedIp !== '0.0.0.0');

        setServerIp(data.serverIp ?? '');
        if (data.adminEmail) {
          // Pass up immediately so configure can pre-fill
          const email = data.adminEmail;
          setDiscoveredData({ serverIp: resolvedIp, adminEmail: email });
        }

        setChecks([
          {
            id: 'server',
            label: `Server IP: ${resolvedIp || 'unknown'}`,
            ok: ipOk ? true : false,
            detail: !serverIpManual && data.serverIp === '0.0.0.0' ? 'Could not auto-detect — enter manually below' : undefined,
          },
          { id: 'docker', label: 'Docker available', ok: data.dockerAvailable ? true : false },
          {
            id: 'cloudflare',
            label: 'Cloudflare token',
            ok: data.cloudflareTokenFound ? true : false,
            detail: data.cloudflareTokenFound ? 'Found' : 'Not found',
          },
          {
            id: 'traefik',
            label: 'Traefik configured',
            ok: data.traefikConfigured ? true : false,
            detail: data.traefikConfigured ? 'Active' : 'Not configured',
          },
          {
            id: 'certificate',
            label: 'SSL certificate',
            ok: data.existingCertificateFound ? true : false,
            detail: data.existingCertificateFound ? 'Active' : 'Will be provisioned',
          },
        ]);
      } catch (err) {
        setDiscoveryError(err instanceof Error ? err.message : 'Unable to contact installation service.');
        setChecks([
          { id: 'server', label: 'Server IP', ok: false, detail: 'Discovery failed' },
          { id: 'docker', label: 'Docker available', ok: false, detail: 'Discovery failed' },
          { id: 'cloudflare', label: 'Cloudflare token', ok: false, detail: 'Discovery failed' },
          { id: 'traefik', label: 'Traefik configured', ok: false, detail: 'Discovery failed' },
          { id: 'certificate', label: 'SSL certificate', ok: false, detail: 'Discovery failed' },
        ]);
      }
    }

    runDiscovery();
  }, [serverIpManual, manualIp]);

  const canContinue = checks.every(c => c.ok !== false) && (!!serverIp.trim() || serverIpManual);

  function handleManualIpChange(value: string) {
    setManualIp(value);
    setServerIpManual(!!value.trim());
  }

  function handleContinue() {
    const resolvedIp = serverIpManual ? manualIp : serverIp;
    const email = discoveredData?.adminEmail ?? '';
    onComplete({ serverIp: resolvedIp, adminEmail: email });
  }

  const needsManualIp = checks.find(c => c.id === 'server')?.detail?.includes('enter manually');

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

        {discoveryError && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-[var(--danger)]/30 text-sm text-[var(--danger)]">
            <div className="font-medium mb-1">Unable to contact installation service.</div>
            <div className="text-[var(--danger)] text-xs">{discoveryError}</div>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {needsManualIp && (
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Server IP (auto-detect failed)</label>
            <input
              type="text"
              value={manualIp}
              onChange={e => handleManualIpChange(e.target.value)}
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
