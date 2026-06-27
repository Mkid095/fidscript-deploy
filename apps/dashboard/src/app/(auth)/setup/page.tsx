'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, LockPasswordIcon, CheckmarkCircle01Icon, Alert01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { Input } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

type SetupStep = 'method' | 'domain' | 'progress' | 'done';
type AuthMethod = 'MAGIC_CODE' | 'PASSWORD';

interface ProgressEvent {
  type: 'status';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep: string | null;
  steps: Array<{ step: string; success: boolean; error?: string }>;
  failureReason?: string;
}

interface DiscoveryInfo {
  serverIp: string;
  lifecycle: string;
}

/** Human-readable labels for the step names emitted by the SSE stream. */
const STEP_LABELS: Record<string, string> = {
  dns: 'DNS',
  proxy: 'Proxy',
  certificate: 'Certificate',
  email: 'Email',
  health: 'Health',
};

function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `${window.location.protocol}//${window.location.host}`;
}

function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json() as Promise<T>;
  });
}

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>('method');
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);

  // Domain form fields
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [platformDomain, setPlatformDomain] = useState('');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Inline domain validation
  const [domainError, setDomainError] = useState<string | null>(null);
  const [validatingDomain, setValidatingDomain] = useState(false);
  const domainValidAbortRef = useRef<AbortController | null>(null);

  // Progress state
  const [progressSteps, setProgressSteps] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const [currentStep, setCurrentStep] = useState('');
  const [progressError, setProgressError] = useState('');
  const [doneDomain, setDoneDomain] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Discover server IP on mount so we pre-fill it in the form
  const [serverIp, setServerIp] = useState('');

  useEffect(() => {
    fetchJson<DiscoveryInfo>('/api/v1/installation/discover')
      .then(data => {
        if (data.lifecycle === 'CONFIGURED') {
          window.location.href = '/login';
        } else {
          setServerIp(data.serverIp);
        }
      })
      .catch(() => {/* non-fatal */});
  }, []);

  // Debounced API validation for domain field while typing.
  useEffect(() => {
    if (!platformDomain) { setDomainError(null); setValidatingDomain(false); return; }
    const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!re.test(platformDomain) || platformDomain.startsWith('.')) {
      setDomainError('Enter a valid domain like deploy.example.com');
      return;
    }
    setDomainError(null);

    const timer = setTimeout(() => {
      domainValidAbortRef.current?.abort();
      const controller = new AbortController();
      domainValidAbortRef.current = controller;
      setValidatingDomain(true);
      const current = platformDomain;
      fetch(
        `${getApiBase()}/api/v1/installation/validate?platformDomain=${encodeURIComponent(current)}`,
        { signal: controller.signal }
      )
        .then(res => res.json())
        .then((payload: { validations: Array<{ step: string; valid: boolean; issues: string[] }> }) => {
          if (current !== platformDomain) return;
          const dnsVal = payload.validations?.find(v => v.step === 'dns');
          if (dnsVal && !dnsVal.valid) setDomainError(dnsVal.issues[0] ?? 'Domain validation failed');
        })
        .catch(err => { if (err.name !== 'AbortError') setDomainError('Validation request failed'); })
        .finally(() => { if (current === platformDomain) setValidatingDomain(false); });
    }, 500);

    return () => { clearTimeout(timer); domainValidAbortRef.current?.abort(); };
  }, [platformDomain]);

  // ── Method selection ──────────────────────────────────────────────────────

  function handleMethodSelect(method: AuthMethod) {
    setSelectedMethod(method);
    setAuthMethod(method);
    setStep('domain');
  }

  // ── Domain form ───────────────────────────────────────────────────────────

  function validateDomainForm(): boolean {
    if (!platformDomain.trim()) { setFormError('Platform domain is required'); return false; }
    if (domainError) { setFormError(domainError); return false; }
    if (!adminEmail.trim()) { setFormError('Admin email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { setFormError('Enter a valid admin email address'); return false; }
    if (authMethod === 'PASSWORD') {
      if (!adminPassword) { setFormError('Password is required'); return false; }
      if (adminPassword.length < 12) { setFormError('Password must be at least 12 characters'); return false; }
      if (adminPassword !== confirmPassword) { setFormError('Passwords do not match'); return false; }
    }
    setFormError('');
    return true;
  }

  async function handleConfigure(e: React.FormEvent) {
    e.preventDefault();
    if (!validateDomainForm()) return;

    const body: Record<string, string> = {
      platformName: platformName.trim() || 'FIDScript Deploy',
      platformDomain: platformDomain.trim(),
      serverIp,
      adminEmail: adminEmail.trim(),
      authMethod: authMethod ?? 'MAGIC_CODE',
    };
    if (authMethod === 'PASSWORD') body.adminPassword = adminPassword;
    if (cloudflareToken.trim()) body.cloudflareApiToken = cloudflareToken.trim();

    setProgressError('');
    setStep('progress');

    try {
      const { operationId } = await fetchJson<{ operationId: string }>('/api/v1/installation/configure', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      openSSE(operationId);
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : 'Configuration request failed');
    }
  }

  // ── SSE progress stream ───────────────────────────────────────────────────

  function openSSE(operationId: string) {
    // Close any existing connection
    eventSourceRef.current?.close();

    // Seed all steps as pending
    setProgressSteps({ dns: 'pending', proxy: 'pending', certificate: 'pending', email: 'pending', health: 'pending' });
    setCurrentStep('');
    setProgressError('');

    const es = new EventSource(`/api/v1/installation/operations/${operationId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as ProgressEvent;
        if (event.type !== 'status') return;

        if (event.status === 'RUNNING') {
          setCurrentStep(event.currentStep ?? '');

          // Mark completed steps as done; the running step stays pending
          const completed = (event.steps ?? []).filter(s => s.success);
          const failed = (event.steps ?? []).filter(s => !s.success);

          setProgressSteps(prev => {
            const next = { ...prev };
            for (const s of completed) next[s.step] = 'done';
            for (const s of failed) next[s.step] = 'error';
            return next;
          });
        }

        if (event.status === 'COMPLETED') {
          // Mark all steps done
          setProgressSteps({ dns: 'done', proxy: 'done', certificate: 'done', email: 'done', health: 'done' });
          setCurrentStep('');
          setDoneDomain(platformDomain.trim());
          es.close();
          // Middleware re-checks lifecycle within 8s; no server-side cache invalidation
          // is possible since the API cannot reach the Next.js process memory.
          setTimeout(() => setStep('done'), 800);
        }

        if (event.status === 'FAILED') {
          const msg = event.failureReason ?? 'An unknown error occurred';
          setProgressError(msg);
          es.close();
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setProgressError('Lost connection to the server. Please refresh and try again.');
      es.close();
    };
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
      <div className="w-full max-w-lg">

        {/* Logo + wordmark */}
        <div className="mb-8 text-center">
          <Image
            src="https://res.cloudinary.com/dfp7uhzy3/image/upload/v1782017464/Generated_Image_June_21__2026_-_2_00AM-removebg-preview_ekpdad.png"
            alt="FIDScript"
            width={64}
            height={64}
            className="mx-auto mb-3 rounded-xl"
          />
          <p className="text-sm font-bold tracking-widest text-[var(--warning)] uppercase">fidscript deploy</p>
        </div>

        {/* ── Step 1: Method selection ───────────────────────────────────── */}
        {step === 'method' && (
          <Card padding="lg">
            <h1 className="text-xl font-bold text-[var(--text)] mb-1">Platform Setup</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">Configure your platform to get started</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Magic Code option */}
              <button
                type="button"
                onClick={() => handleMethodSelect('MAGIC_CODE')}
                className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]/50 transition-all duration-200 text-left"
              >
                <HugeiconsIcon icon={Mail01Icon} size={28} className="text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">Magic Code</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    Email verification code each login — password-free
                  </p>
                  <span className="inline-block mt-2 text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
              </button>

              {/* Password option */}
              <button
                type="button"
                onClick={() => handleMethodSelect('PASSWORD')}
                className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]/50 transition-all duration-200 text-left"
              >
                <HugeiconsIcon icon={LockPasswordIcon} size={28} className="text-[var(--warning)]" />
                <div>
                  <p className="font-semibold text-[var(--text)] group-hover:text-orange-300">Email + Password</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    Traditional password-based login
                  </p>
                </div>
              </button>
            </div>
          </Card>
        )}

        {/* ── Step 2: Domain & credentials form ──────────────────────────── */}
        {step === 'domain' && (
          <Card padding="lg">
            {/* Back button + auth method badge */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => { setStep('method'); setSelectedMethod(null); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] flex items-center gap-1"
              >
                ← Back
              </button>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                authMethod === 'PASSWORD'
                  ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]'
                  : 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
              }`}>
                <HugeiconsIcon
                  icon={authMethod === 'PASSWORD' ? LockPasswordIcon : Mail01Icon}
                  size={12}
                />
                {authMethod === 'PASSWORD' ? 'Email + Password' : 'Magic Code'}
              </span>
            </div>

            <h2 className="text-lg font-bold text-[var(--text)] mb-1">Platform Details</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {authMethod === 'MAGIC_CODE'
                ? 'You will receive a verification code by email each time you log in.'
                : 'Your admin password must be at least 12 characters.'}
            </p>

            <form onSubmit={handleConfigure} noValidate className="flex flex-col gap-4">
              <Input
                label="Platform Name"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                placeholder="FIDScript Deploy"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />

              <div>
                <label htmlFor="platformDomain" className="block text-xs text-[var(--text-muted)] mb-1.5">
                  Platform Domain
                  {validatingDomain ? (
                    <span className="ml-2 text-[var(--warning)]">checking…</span>
                  ) : platformDomain && !domainError ? (
                    <span className="ml-1 text-[var(--success)]"></span>
                  ) : null}
                </label>
                <input
                  id="platformDomain"
                  type="text"
                  value={platformDomain}
                  onChange={e => { setPlatformDomain(e.target.value); setFormError(''); }}
                  placeholder="deploy.mycompany.com"
                  className="w-full bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
                />
                {domainError ? (
                  <p className="text-xs text-[var(--danger)] mt-1">{domainError}</p>
                ) : !domainError && platformDomain ? (
                  <p className="text-xs text-[var(--success)] mt-1">Looks good</p>
                ) : null}
              </div>

              <Input
                label="Cloudflare API Token"
                type="password"
                value={cloudflareToken}
                onChange={e => setCloudflareToken(e.target.value)}
                placeholder="Press Enter to skip if you don't use Cloudflare"
                hint="Used for automatic DNS configuration. Optional."
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />

              <Input
                label="Admin Email"
                type="email"
                value={adminEmail}
                onChange={e => { setAdminEmail(e.target.value); setFormError(''); }}
                placeholder="admin@example.com"
                required
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />

              {authMethod === 'PASSWORD' && (
                <>
                  <Input
                    label="Admin Password"
                    type="password"
                    value={adminPassword}
                    onChange={e => { setAdminPassword(e.target.value); setFormError(''); }}
                    placeholder="Minimum 12 characters"
                    required
                    minLength={12}
                    className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setFormError(''); }}
                    placeholder="Repeat your password"
                    required
                    minLength={12}
                    className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
                  />
                </>
              )}

              {formError && (
                <p className="text-sm text-[var(--danger)]" role="alert">{formError}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
              >
                Configure Platform
              </Button>
            </form>
          </Card>
        )}

        {/* ── Step 3: Progress ─────────────────────────────────────────── */}
        {step === 'progress' && (
          <Card padding="lg">
            <h2 className="text-lg font-bold text-[var(--text)] mb-1">Configuring Your Platform</h2>
            {!progressError && (
              <p className="text-sm text-[var(--text-muted)] mb-8">
                This takes a few minutes. Please wait…
              </p>
            )}

            {/* Step list */}
            <div className="flex flex-col gap-3 mb-8">
              {(['dns', 'proxy', 'certificate', 'email', 'health'] as const).map(key => {
                const label = STEP_LABELS[key] ?? key;
                const status = progressSteps[key] ?? 'pending';
                const isCurrent = currentStep === key && status === 'pending';

                return (
                  <div key={key} className="flex items-center gap-3">
                    {status === 'done' ? (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-400 shrink-0" />
                    ) : status === 'error' ? (
                      <span className="text-[var(--danger)] text-sm shrink-0"></span>
                    ) : isCurrent ? (
                      <Spinner size="sm" className="text-[var(--accent)] shrink-0" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border border-slate-600 shrink-0" />
                    )}
                    <span className={`text-sm ${status === 'done' ? 'text-green-400' : status === 'error' ? 'text-[var(--danger)]' : isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {label}
                    </span>
                    {isCurrent && <span className="text-xs text-[var(--text-muted)] animate-pulse">running…</span>}
                  </div>
                );
              })}
            </div>

            {progressError ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30">
                  <span className="text-[var(--danger)] shrink-0 mt-0.5"></span>
                  <div>
                    <p className="text-sm text-[var(--danger)] font-medium">Configuration failed</p>
                    <p className="text-xs text-[var(--danger)]/80 mt-1">{progressError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProgressSteps({});
                    setProgressError('');
                    setStep('method');
                  }}
                  className="w-full py-3 rounded-lg border border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-slate-500 text-sm transition-colors"
                >
                  Run setup again
                </button>
              </div>
            ) : null}
          </Card>
        )}

        {/* ── Step 4: Done ──────────────────────────────────────────────── */}
        {step === 'done' && (
          <Card padding="lg" className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={36} className="text-green-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[var(--text)] mb-1">Setup complete!</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Your platform is ready at{' '}
                  <a
                    href={`https://${doneDomain}`}
                    className="text-[var(--accent)] hover:text-[var(--accent)] underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://{doneDomain}
                  </a>
                </p>
              </div>

              <a
                href={`https://${doneDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-[var(--success)] hover:bg-[var(--success)]/90 text-[var(--text)] px-6 py-3 text-base transition-colors duration-200 mt-2"
              >
                Visit your dashboard
                <span aria-hidden="true">→</span>
              </a>

              <p className="text-xs text-[var(--text-dim)] max-w-xs">
                This link is your permanent access point. The IP-based URL will redirect here from now on.
              </p>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
