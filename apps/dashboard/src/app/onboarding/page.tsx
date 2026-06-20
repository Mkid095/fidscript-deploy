'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';
import { Spinner } from '@fidscript/ui';

type CheckId = 'docker' | 'database' | 'domain' | 'ssl' | 'email';

interface CheckState {
  status: 'idle' | 'running' | 'healthy' | 'unhealthy';
  detail?: string;
}

type WizardStep = 'welcome' | 'discovery' | 'configure' | 'progress' | 'complete';

const POLL_INTERVAL = 5000;
const RUN_TIMEOUT = 30_000;

const PLATFORM_DOMAIN =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    : 'deploy.fidscript.com';

const SERVER_IP =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SERVER_IP
    ? process.env.NEXT_PUBLIC_SERVER_IP
    : '127.0.0.1';

const CHECKS: { id: CheckId; label: string; why: string }[] = [
  { id: 'docker', label: 'Docker services up', why: 'Core platform services are running' },
  { id: 'database', label: 'Database reachable', why: 'Postgres is accepting connections' },
  { id: 'domain', label: 'Domain verified', why: `${PLATFORM_DOMAIN} resolves to this server` },
  { id: 'ssl', label: 'SSL certificate active', why: 'HTTPS is working and trusted' },
  { id: 'email', label: 'Email working', why: 'Stalwart SMTP is accepting mail' },
];

function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  return `${window.location.protocol}//${window.location.host}`;
}

async function probeDocker(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/health`);
    if (!res.ok) return { status: 'unhealthy', detail: `HTTP ${res.status}` };
    const data = await res.json() as { status: string; services?: Record<string, { status: string }> };
    const docker = data.services?.database;
    if (!docker || docker.status !== 'up') {
      return { status: 'unhealthy', detail: docker ? `database: ${docker.status}` : 'no service data' };
    }
    return { status: 'healthy' };
  } catch (err) {
    return { status: 'unhealthy', detail: err instanceof Error ? err.message : 'connection failed' };
  }
}

async function probeDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/health`);
    if (!res.ok) return { status: 'unhealthy', detail: `HTTP ${res.status}` };
    const data = await res.json() as { services?: Record<string, { status: string; error?: string }> };
    const db = data.services?.database;
    if (!db) return { status: 'unhealthy', detail: 'no service data' };
    if (db.status !== 'up') return { status: 'unhealthy', detail: db.error ?? db.status };
    return { status: 'healthy' };
  } catch (err) {
    return { status: 'unhealthy', detail: err instanceof Error ? err.message : 'connection failed' };
  }
}

async function probeDomain(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=deploy.${PLATFORM_DOMAIN}&type=A`;
    const res = await fetch(url, { headers: { Accept: 'application/dns-json' } } as RequestInit);
    if (!res.ok) return { status: 'unhealthy', detail: `DoH HTTP ${res.status}` };
    const data = await res.json() as { Answer?: Array<{ data: string }> };
    const answer = data.Answer?.find(a => a.data === SERVER_IP);
    if (!answer) {
      const got = data.Answer?.map(a => a.data).join(', ') ?? 'no A record';
      return { status: 'unhealthy', detail: `expected ${SERVER_IP}, got ${got}` };
    }
    return { status: 'healthy' };
  } catch (err) {
    return { status: 'unhealthy', detail: err instanceof Error ? err.message : 'DNS lookup failed' };
  }
}

async function probeSSL(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const res = await fetch(`https://${PLATFORM_DOMAIN}/.well-known/fidscript`, { redirect: 'manual' });
    if (res.status === 200) return { status: 'healthy' };
    return { status: 'unhealthy', detail: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'unhealthy', detail: err instanceof Error ? err.message : 'fetch failed' };
  }
}

async function probeEmail(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/health/email`);
    if (!res.ok) return { status: 'unhealthy', detail: `HTTP ${res.status}` };
    const data = await res.json() as { status: string; error?: string };
    if (data.status !== 'ok') return { status: 'unhealthy', detail: data.error ?? 'degraded' };
    return { status: 'healthy' };
  } catch (err) {
    return { status: 'unhealthy', detail: err instanceof Error ? err.message : 'connection failed' };
  }
}

async function runCheck(id: CheckId): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  switch (id) {
    case 'docker': return probeDocker();
    case 'database': return probeDatabase();
    case 'domain': return probeDomain();
    case 'ssl': return probeSSL();
    case 'email': return probeEmail();
  }
}

function isOnboarded(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(c => c === 'fidscript_onboarded=1');
}

function setOnboardedCookie() {
  if (typeof document === 'undefined') return;
  const domain = PLATFORM_DOMAIN.startsWith('localhost') ? undefined : `.${PLATFORM_DOMAIN}`;
  document.cookie = `fidscript_onboarded=1; path=/; max-age=31536000${domain ? `; domain=${domain}` : ''}`;
}

function HealthRow({ label, why, check }: { label: string; why: string; check: CheckState }) {
  const badgeStatus = check.status === 'idle' ? 'idle'
    : check.status === 'running' ? 'running'
    : check.status === 'healthy' ? 'healthy'
    : 'unhealthy';

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-[#0f1117] border border-[#1e2130]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{why}</div>
        {check.detail && (
          <div className="text-xs text-red-400 mt-1 truncate">{check.detail}</div>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        badgeStatus === 'healthy' ? 'bg-emerald-400' :
        badgeStatus === 'unhealthy' ? 'bg-red-400' :
        badgeStatus === 'running' ? 'bg-yellow-400 animate-pulse' :
        'bg-slate-600'
      }`} />
    </div>
  );
}

interface ProgressEntry { text: string; ok: boolean; }

export default function OnboardingPage() {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [checks, setChecks] = useState<Record<CheckId, CheckState>>({
    docker: { status: 'idle' }, database: { status: 'idle' },
    domain: { status: 'idle' }, ssl: { status: 'idle' }, email: { status: 'idle' },
  });
  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState('FIDScript Deploy');
  const [adminEmail, setAdminEmail] = useState('');
  const [configuring, setConfiguring] = useState(false);
  const [configLogs, setConfigLogs] = useState<ProgressEntry[]>([]);
  const [allGreen, setAllGreen] = useState(false);
  const [domainValidating, setDomainValidating] = useState(false);
  const startedRef = useRef<Record<CheckId, number>>({
    docker: 0, database: 0, domain: 0, ssl: 0, email: 0,
  });

  // Skip if already onboarded.
  useEffect(() => {
    if (isOnboarded()) window.location.href = '/login';
  }, []);

  // Load discovery data from API.
  useEffect(() => {
    if (step !== 'configure') return;
    async function loadDiscovery() {
      try {
        const res = await fetch(`${getApiBase()}/api/v1/installation/discover`);
        if (res.ok) {
          const data = await res.json() as { serverIp: string; adminEmail: string | null };
          if (data.serverIp && data.serverIp !== '0.0.0.0') setDomain(PLATFORM_DOMAIN);
          if (data.adminEmail) setAdminEmail(data.adminEmail);
        }
      } catch {
        // Use defaults
      }
    }
    loadDiscovery();
  }, [step]);

  // Run discovery checks.
  useEffect(() => {
    if (step !== 'discovery') return;

    async function poll() {
      await Promise.all(CHECKS.map(async ({ id }) => {
        const startedAt = Date.now();
        startedRef.current[id] = startedAt;
        setChecks(prev => ({
          ...prev,
          [id]: { status: prev[id].status === 'idle' ? 'running' : prev[id].status },
        }));
        const result = await runCheck(id);
        if (startedRef.current[id] !== startedAt) return;
        const elapsed = Date.now() - startedAt;
        if (elapsed >= RUN_TIMEOUT && result.status !== 'healthy') {
          setChecks(prev => ({ ...prev, [id]: { status: 'unhealthy', detail: 'Service did not respond' } }));
          return;
        }
        setChecks(prev => ({ ...prev, [id]: result }));
      }));
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [step]);

  // Update allGreen.
  useEffect(() => {
    setAllGreen(Object.values(checks).every(c => c.status === 'healthy'));
  }, [checks]);

  function validateDomain(value: string): boolean {
    const re = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!value) { setDomainError(null); return false; }
    const ok = re.test(value) && !value.startsWith('.') && value.length <= 253;
    setDomainError(ok ? null : 'Enter a valid domain like deploy.example.com');
    return ok;
  }

  // Inline domain validation against the API.
  async function checkDomainApi(value: string): Promise<string | null> {
    if (!value || !validateDomain(value)) return null;
    setDomainValidating(true);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/installation/validate?platformDomain=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = await res.json() as { validations: Array<{ step: string; valid: boolean; issues: string[] }> };
        const dnsVal = data.validations?.find(v => v.step === 'dns');
        if (dnsVal && !dnsVal.valid) return dnsVal.issues[0] ?? 'Domain validation failed';
      }
    } catch {
      // Fall through to format-only check
    } finally {
      setDomainValidating(false);
    }
    return null;
  }

  function handleStartConfigure() {
    setStep('discovery');
  }

  function handleContinueToConfig() {
    if (!allGreen) return;
    setStep('configure');
  }

  async function handleConfigure() {
    if (!domain.trim() || !!domainError) return;
    setConfiguring(true);
    setStep('progress');
    setConfigLogs([{ text: 'Starting configuration…', ok: true }]);

    try {
      // Start configuration
      const configureRes = await fetch(`${getApiBase()}/api/v1/installation/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName: platformName.trim(),
          platformDomain: domain.trim(),
          serverIp: SERVER_IP,
          adminEmail: adminEmail.trim(),
        }),
      });

      if (!configureRes.ok) {
        const err = await configureRes.json().catch(() => ({ message: 'Configuration failed' }));
        setConfigLogs(prev => [...prev, { text: `Error: ${err.message ?? configureRes.statusText}`, ok: false }]);
        setConfiguring(false);
        return;
      }

      const { operationId } = await configureRes.json() as { operationId: string };

      // Stream progress via SSE
      const streamRes = await fetch(`${getApiBase()}/api/v1/installation/operations/${operationId}/stream`);
      const reader = streamRes.body?.getReader();
      if (!reader) {
        setConfigLogs(prev => [...prev, { text: 'Could not open progress stream', ok: false }]);
        setConfiguring(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === 'done' || data.type === 'error') break;
          if (data.status === 'COMPLETED') {
            setConfigLogs(prev => [...prev, { text: 'Platform configured successfully.', ok: true }]);
          } else if (data.status === 'FAILED') {
            setConfigLogs(prev => [...prev, { text: `Failed: ${data.failureReason ?? 'Unknown error'}`, ok: false }]);
          }
        }
      }
    } catch (err) {
      setConfigLogs(prev => [...prev, {
        text: err instanceof Error ? err.message : 'Configuration failed',
        ok: false,
      }]);
    }

    setConfiguring(false);
  }

  function handleContinue() {
    setOnboardedCookie();
    window.location.href = '/login';
  }

  const greenCount = Object.values(checks).filter(c => c.status === 'healthy').length;

  // ── Welcome ────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-slate-200 mb-2">FIDScript</h1>
          <p className="text-slate-500 mb-8">Self-hosted deployment platform</p>
          <Button variant="primary" size="lg" onClick={handleStartConfigure} className="w-full mb-4">
            Create a new platform
          </Button>
          <p className="text-xs text-slate-600">
            Need help? <a href="/docs" className="text-blue-500 hover:text-blue-400">View the docs</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Discovery ──────────────────────────────────────────────
  if (step === 'discovery') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <Card padding="lg" className="w-full max-w-2xl border border-[#1e2130]">
          <div className="text-center mb-6">
            <div className="text-lg font-semibold text-slate-200 mb-1">Setting up FIDScript</div>
            <div className="text-sm text-slate-500">Checking your system before configuration.</div>
          </div>
          <div className="space-y-2 mb-6">
            {CHECKS.map(({ id, label, why }) => (
              <HealthRow key={id} label={label} why={why} check={checks[id]} />
            ))}
          </div>
          {allGreen && (
            <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-center text-sm text-emerald-300 mb-4">
              {greenCount}/{CHECKS.length} checks passing — system is ready.
            </div>
          )}
          <Button variant="primary" disabled={!allGreen} onClick={handleContinueToConfig} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  // ── Configure ──────────────────────────────────────────────
  if (step === 'configure') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
          <div className="text-center mb-6">
            <div className="text-lg font-semibold text-slate-200 mb-1">Configure your platform</div>
            <div className="text-sm text-slate-500">Only the essentials — everything else is in Settings.</div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Platform name</label>
              <input
                type="text"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Platform domain
                {domainValidating ? (
                  <span className="ml-2 text-yellow-400">checking…</span>
                ) : domain && !domainError ? (
                  <span className="ml-1 text-emerald-400">✓</span>
                ) : null}
              </label>
              <input
                type="text"
                value={domain}
                onChange={e => {
                  setDomain(e.target.value);
                  validateDomain(e.target.value);
                  // Debounce API validation
                  const v = e.target.value;
                  setTimeout(() => checkDomainApi(v), 500);
                }}
                placeholder="deploy.example.com"
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              {domainError && <p className="text-xs text-red-400 mt-1">{domainError}</p>}
              {!domainError && domain && <p className="text-xs text-emerald-400 mt-1">Looks good</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Administrator email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-[#080a0d] border border-[#1e2130] text-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!domain.trim() || !!domainError || !adminEmail.trim() || configuring}
            loading={configuring}
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
      <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
        <Card padding="lg" className="w-full max-w-md border border-[#1e2130]">
          <div className="text-center mb-6">
            <div className="text-lg font-semibold text-slate-200 mb-1">Configuring your platform</div>
            <div className="text-sm text-slate-500">This takes about a minute.</div>
          </div>
          <div className="space-y-2 mb-6">
            {configLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`flex-shrink-0 ${log.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {log.ok ? '✓' : '✗'}
                </span>
                <span className={log.ok ? 'text-slate-300' : 'text-red-300'}>{log.text}</span>
              </div>
            ))}
            {configuring && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
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
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-md border border-[#1e2130] text-center">
        <div className="text-4xl mb-4">✓</div>
        <div className="text-lg font-semibold text-slate-200 mb-1">Platform configured</div>
        <div className="text-sm text-slate-500 mb-6">
          FIDScript is ready. SSL certificate is being provisioned in the background.
        </div>
        <Button variant="primary" onClick={handleContinue} className="w-full">
          Go to login
        </Button>
      </Card>
    </div>
  );
}
