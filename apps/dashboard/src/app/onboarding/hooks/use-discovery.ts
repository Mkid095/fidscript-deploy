'use client';

import { useEffect, useState } from 'react';

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

interface UseDiscoveryOptions {
  manualMode: boolean;
  manualIp: string;
}

export function useDiscovery({ manualMode, manualIp }: UseDiscoveryOptions) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ serverIp: string; adminEmail: string } | null>(null);

  useEffect(() => {
    setError(null);
    setChecks([
      { id: 'server', label: 'Server IP: …', ok: null },
      { id: 'docker', label: 'Docker available', ok: null },
      { id: 'cloudflare', label: 'Cloudflare token', ok: null },
      { id: 'traefik', label: 'Traefik configured', ok: null },
      { id: 'certificate', label: 'SSL certificate', ok: null },
    ]);

    const base = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3001';

    fetch(`${base}/api/v1/installation/discover`)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: DiscoveryResult) => {
        const ip = manualMode ? manualIp : (data.serverIp ?? '');
        const ipOk = manualMode || (ip && ip !== '0.0.0.0');
        setResult({ serverIp: ip, adminEmail: data.adminEmail ?? '' });
        setChecks([
          {
            id: 'server',
            label: `Server IP: ${ip || 'unknown'}`,
            ok: ipOk ? true : false,
            detail: !manualMode && data.serverIp === '0.0.0.0' ? 'Could not auto-detect — enter manually below' : undefined,
          },
          { id: 'docker', label: 'Docker available', ok: data.dockerAvailable },
          {
            id: 'cloudflare',
            label: 'Cloudflare token',
            ok: data.cloudflareTokenFound,
            detail: data.cloudflareTokenFound ? 'Found' : 'Not found',
          },
          {
            id: 'traefik',
            label: 'Traefik configured',
            ok: data.traefikConfigured,
            detail: data.traefikConfigured ? 'Active' : 'Not configured',
          },
          {
            id: 'certificate',
            label: 'SSL certificate',
            ok: data.existingCertificateFound,
            detail: data.existingCertificateFound ? 'Active' : 'Will be provisioned',
          },
        ]);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unable to contact installation service.');
        setChecks([
          { id: 'server', label: 'Server IP', ok: false, detail: 'Discovery failed' },
          { id: 'docker', label: 'Docker available', ok: false, detail: 'Discovery failed' },
          { id: 'cloudflare', label: 'Cloudflare token', ok: false, detail: 'Discovery failed' },
          { id: 'traefik', label: 'Traefik configured', ok: false, detail: 'Discovery failed' },
          { id: 'certificate', label: 'SSL certificate', ok: false, detail: 'Discovery failed' },
        ]);
      });
  }, [manualMode, manualIp]);

  return { checks, error, result };
}
