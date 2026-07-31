'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

type WizardStep = 'welcome' | 'discovery' | 'configure' | 'progress' | 'complete';

const PLATFORM_DOMAIN =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    : 'deploy.fidscript.com';

function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `${window.location.protocol}//${window.location.host}`;
}

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

function isOnboarded(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(c => c === 'fidscript_onboarded=1');
}

function setOnboardedCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'fidscript_onboarded=1; path=/; max-age=31536000';
}

function HealthRow({ label, detail, ok }: { label: string; detail?: string; ok: boolean | null }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text)]">{label}</div>
        {detail && <div className="text-xs text-[var(--text-muted)] mt-0.5">{detail}</div>}
      </div>
      {ok === null ? (
        <div className="w-2 h-2 rounded-full bg-slate-600" />
      ) : ok ? (
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-red-400" />
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [checks, setChecks] = useState<Check[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [serverIpManual, setServerIpManual] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [domain, setDomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [configLogs, setConfigLogs] = useState<{ text: string; ok: boolean }[]>([]);
  const [certPending, setCertPending] = useState(false);
  const [configComplete, setConfigComplete] = useState(false);

  // Skip if already onboarded.
  useEffect(() => {
    if (isOnboarded()) window.location.href = '/login';
  }, []);

  // Run discovery against the orchestrator endpoint.
  useEffect(() => {
    if (step !== 'discovery') return;

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

        setServerIp(data.serverIp ?? '');
        if (data.adminEmail) setAdminEmail(data.adminEmail);

        setChecks([
          {
            id: 'server',
            label: serverIpManual ? `Server IP: ${data.serverIp ?? 'unknown'}` : `Server IP: ${data.serverIp ?? 'unknown'}`,
            ok: data.serverIp && data.serverIp !== '0.0.0.0' || serverIpManual ? true : false,
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
  }, [step, serverIpManual]);

  // Debounced API validation for domain field — uses AbortController to cancel stale requests.
  const domainValidAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (step !== 'configure' || !domain) return;
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
        `${getApiBase()}/api/v1/installation/validate?platformDomain=${encodeURIComponent(currentDomain)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((payload: { validations: Array<{ step: string; valid: boolean; issues: string[] }> }) => {
          // Ignore stale responses — only apply if domain still matches
          if (currentDomain !== domain) return;
          const dnsVal = payload.validations?.find(v => v.step === 'dns');
          if (dnsVal && !dnsVal.valid) setDomainError(dnsVal.issues[0] ?? 'Domain validation failed');
        })
        .catch(err => { if (err.name !== 'AbortError') setDomainError('Validation request failed'); })
        .finally(() => { if (currentDomain === domain) setValidating(false); });
    }, 500);

    return () => { clearTimeout(timer); domainValidAbortRef.current?.abort(); };
  }, [domain, step]);

  const canContinue =
    checks.every(c => c.ok !== false) && (!!serverIp.trim() || serverIpManual);

  function handleStart() {
    setStep('discovery');
  }

  function handleContinueToConfig() {
    if (!canContinue) return;
    setDomain(PLATFORM_DOMAIN);
    setStep('configure');
  }

  async function handleConfigure() {
    if (!domain.trim() || domainError || !adminEmail.trim()) return;
    setConfigLogs([{ text: 'Starting configuration…', ok: true }]);
    setStep('progress');

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const res = await fetch(`${getApiBase()}/api/v1/installation/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName: platformName.trim(),
          platformDomain: domain.trim(),
          serverIp: serverIpManual ? manualIp.trim() : serverIp,
          adminEmail: adminEmail.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Configuration failed' }));
        setConfigLogs(prev => [...prev, { text: `Error: ${err.message}`, ok: false }]);
        return;
      }

      const { operationId } = await res.json() as { operationId: string };

      const abortController = new AbortController();
      const signal = abortController.signal;

      const streamRes = await fetch(
        `${getApiBase()}/api/v1/installation/operations/${operationId}/stream`,
        { signal }
      );
      reader = streamRes.body?.getReader() ?? null;
      if (!reader) {
        setConfigLogs(prev => [...prev, { text: 'Could not open progress stream', ok: false }]);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as {
            type?: string;
            status?: string;
            failureReason?: string;
            currentStep?: string;
          };
          if (data.type === 'error') {
            setConfigLogs(prev => [...prev, { text: `Error: ${data.type}`, ok: false }]);
            break;
          }
          if (data.status === 'COMPLETED') {
            setConfigLogs(prev => [...prev, { text: 'Platform configured successfully.', ok: true }]);
            setCertPending(true);
            setConfigComplete(true);
          } else if (data.status === 'FAILED') {
            setConfigLogs(prev => [...prev, { text: `Failed: ${data.failureReason ?? 'Unknown error'}`, ok: false }]);
          } else if (data.currentStep) {
            setConfigLogs(prev => {
              // Always append — do not discard completed steps
              const last = prev[prev.length - 1];
              if (last && last.text.startsWith('')) {
                return [...prev.slice(0, -1), { text: ` ${last.text.slice(2)}`, ok: true }, { text: ` ${data.currentStep}`, ok: true }];
              }
              return [...prev, { text: ` ${data.currentStep}`, ok: true }];
            });
          }
        }
      }

      abortController.abort();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setConfigLogs(prev => [...prev, { text: err instanceof Error ? err.message : 'Configuration failed', ok: false }]);
    } finally {
      reader?.cancel().catch(() => {});
    }
  }

  function handleContinue() {
    setOnboardedCookie();
    window.location.href = '/login';
  }

  // ── Welcome ────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">FIDScript</h1>
          <p className="text-[var(--text-muted)] mb-8">Self-hosted deployment platform</p>
          <Button variant="primary" size="lg" onClick={handleStart} className="w-full mb-4">
            Create a new platform
          </Button>
          <p className="text-xs text-[var(--text-dim)]">
            Need help? <Link href="/docs" className="text-[var(--accent)] hover:text-[var(--accent)]">View the docs</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Discovery ──────────────────────────────────────────────
  if (step === 'discovery') {
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep('discovery')}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Manual IP entry when auto-detect fails */}
          {checks.length > 0 && checks.find(c => c.id === 'server')?.detail?.includes('enter manually') && (
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">Server IP (auto-detect failed)</label>
              <input
                type="text"
                value={manualIp}
                onChange={e => {
                  setManualIp(e.target.value);
                  setServerIpManual(!!e.target.value.trim());
                }}
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
          <Button variant="primary" disabled={!canContinue} onClick={handleContinueToConfig} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  // ── Configure ──────────────────────────────────────────────
  if (step === 'configure') {
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
          <Button
            variant="primary"
            disabled={!domain.trim() || !!domainError || !adminEmail.trim()}
            onClick={handleConfigure}
            className="w-full mt-6"
          >
            Configure platform
          </Button>
        </Card>
      </div>
    );
  }

  // ── Progress ───────────────────────────────────────────────
  if (step === 'progress') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card padding="lg" className="w-full max-w-md border border-[var(--rail)]">
          <div className="text-center mb-6">
            <div className="text-lg font-semibold text-[var(--text)] mb-1">Configuring your platform</div>
            <div className="text-sm text-[var(--text-muted)]">This takes about a minute.</div>
          </div>
          <div className="space-y-2 mb-6">
            {configLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`flex-shrink-0 ${log.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {log.ok ? '' : ''}
                </span>
                <span className={log.ok ? 'text-[var(--text-muted)]' : 'text-[var(--danger)]'}>{log.text}</span>
              </div>
            ))}
            {!configComplete && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Spinner size="sm" />
                <span>Processing…</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Complete ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[var(--rail)] text-center">
        <div className="text-4xl mb-4"></div>
        <div className="text-lg font-semibold text-[var(--text)] mb-1">Platform configured</div>
        <div className="text-sm text-[var(--text-muted)] mb-2">FIDScript is ready.</div>
        {certPending && (
          <div className="text-xs text-[var(--warning)] mb-4">
            SSL certificate is being provisioned — this usually takes under 2 minutes.
          </div>
        )}
        <Button variant="primary" onClick={handleContinue} className="w-full">
          Go to login
        </Button>
      </Card>
    </div>
  );
}
