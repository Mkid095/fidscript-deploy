'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

const PLATFORM_DOMAIN =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    : 'deploy.fidscript.com';

interface ConfigureStepProps {
  prefillServerIp: string;
  prefillAdminEmail: string;
  onConfigure: () => void;
}

export function ConfigureStep({ prefillServerIp, prefillAdminEmail, onConfigure }: ConfigureStepProps) {
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // Pre-fill domain and admin email from discovery results
  useEffect(() => {
    setDomain(PLATFORM_DOMAIN);
    if (prefillAdminEmail) setAdminEmail(prefillAdminEmail);
  }, [prefillAdminEmail]);

  const domainValidAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!domain) { setDomainError(null); setValidating(false); return; }
    const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const formatOk = re.test(domain) && !domain.startsWith('.') && domain.length <= 253;
    if (!formatOk) { setDomainError('Enter a valid domain like deploy.example.com'); return; }
    setDomainError(null);

    const timer = setTimeout(() => {
      domainValidAbortRef.current?.abort();
      const controller = new AbortController();
      domainValidAbortRef.current = controller;
      setValidating(true);
      const currentDomain = domain;
      fetch(
        `${window.location.protocol}//${window.location.host}/api/v1/installation/validate?platformDomain=${encodeURIComponent(currentDomain)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((payload: { validations: Array<{ step: string; valid: boolean; issues: string[] }> }) => {
          if (currentDomain !== domain) return;
          const dnsVal = payload.validations?.find(v => v.step === 'dns');
          if (dnsVal && !dnsVal.valid) setDomainError(dnsVal.issues[0] ?? 'Domain validation failed');
        })
        .catch(err => { if (err.name !== 'AbortError') setDomainError('Validation request failed'); })
        .finally(() => { if (currentDomain === domain) setValidating(false); });
    }, 500);

    return () => { clearTimeout(timer); domainValidAbortRef.current?.abort(); };
  }, [domain]);

  const canSubmit = domain.trim() && !domainError && adminEmail.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    onConfigure();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-[var(--text)] mb-1">Configure your platform</div>
          <div className="text-sm text-[var(--text-muted)]">Only the essentials — everything else is in Settings.</div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Platform name</label>
            <input
              type="text"
              value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">
              Platform domain
              {validating ? (
                <span className="ml-2 text-[var(--warning)]">checking…</span>
              ) : domain && !domainError ? (
                <span className="ml-1 text-[var(--success)]"></span>
              ) : null}
            </label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="deploy.example.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            {domainError ? (
              <p className="text-xs text-[var(--danger)] mt-1">{domainError}</p>
            ) : !domainError && domain ? (
              <p className="text-xs text-[var(--success)] mt-1">Looks good</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Administrator email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit} className="w-full mt-6">
          Configure platform
        </Button>
      </Card>
    </div>
  );
}
