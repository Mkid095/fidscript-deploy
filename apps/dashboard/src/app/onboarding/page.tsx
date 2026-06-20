'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@fidscript/ui';
import { Card } from '@fidscript/ui';

import { HealthBadge } from '@/components/auth/health-badge';

type CheckId = 'docker' | 'database' | 'domain' | 'ssl' | 'email';

interface CheckState {
  status: 'idle' | 'running' | 'healthy' | 'unhealthy';
  detail?: string;
}

const POLL_INTERVAL = 5000;
const RUN_TIMEOUT = 30_000;

// Platform domain — injected at build time via docker-compose env.
// In dev, defaults to deploy.fidscript.com (the staging domain).
const PLATFORM_DOMAIN =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    ? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN
    : 'deploy.fidscript.com';

const SERVER_IP =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SERVER_IP
    ? process.env.NEXT_PUBLIC_SERVER_IP
    : '127.0.0.1';

const CHECKS: { id: CheckId; label: string; why: string; docsAnchor: string }[] = [
  {
    id: 'docker',
    label: 'Docker services up',
    why: 'Core platform services are running',
    docsAnchor: 'installation#docker-services',
  },
  {
    id: 'database',
    label: 'Database reachable',
    why: 'Postgres is accepting connections',
    docsAnchor: 'installation#database',
  },
  {
    id: 'domain',
    label: 'Domain verified',
    why: `${PLATFORM_DOMAIN} resolves to this server`,
    docsAnchor: 'installation#dns',
  },
  {
    id: 'ssl',
    label: 'SSL certificate active',
    why: 'HTTPS is working and trusted',
    docsAnchor: 'installation#ssl',
  },
  {
    id: 'email',
    label: 'Email working',
    why: 'Stalwart SMTP is accepting mail',
    docsAnchor: 'installation#email',
  },
];

function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  // In production the dashboard and API are on the same host, proxied by Traefik.
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
    // Use Cloudflare DoH to look up A record for deploy.<domain>.
    const url = `https://cloudflare-dns.com/dns-query?name=deploy.${PLATFORM_DOMAIN}&type=A`;
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
    } as RequestInit);
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
    const res = await fetch(`https://${PLATFORM_DOMAIN}/.well-known/fidscript`, {
      // Do not follow redirects — Traefik ACME challenge returns 200 directly.
      redirect: 'manual',
    });
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

async function runCheck(id: CheckId): Promise<CheckState> {
  switch (id) {
    case 'docker':  return probeDocker();
    case 'database': return probeDatabase();
    case 'domain':  return probeDomain();
    case 'ssl':     return probeSSL();
    case 'email':   return probeEmail();
  }
}

function isOnboarded(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(c => c === 'fidscript_onboarded=1');
}

function setOnboardedCookie() {
  if (typeof document === 'undefined') return;
  // Cookie set on the platform domain so it persists across subdomains.
  const domain = PLATFORM_DOMAIN.startsWith('localhost')
    ? undefined
    : `.${PLATFORM_DOMAIN}`;
  document.cookie = `fidscript_onboarded=1; path=/; max-age=31536000${domain ? `; domain=${domain}` : ''}`;
}

export default function OnboardingPage() {
  const [checks, setChecks] = useState<Record<CheckId, CheckState>>({
    docker: { status: 'idle' },
    database: { status: 'idle' },
    domain: { status: 'idle' },
    ssl: { status: 'idle' },
    email: { status: 'idle' },
  });
  const [allGreen, setAllGreen] = useState(false);
  const [anyRed, setAnyRed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const startedRef = useRef<Record<CheckId, number>>({
    docker: 0, database: 0, domain: 0, ssl: 0, email: 0,
  });

  // Check cookie on mount — skip if already onboarded.
  useEffect(() => {
    if (isOnboarded()) {
      window.location.href = '/login';
      return;
    }
  }, []);

  // Poll all checks every 5s.
  useEffect(() => {
    if (isOnboarded()) return;

    async function poll() {
      await Promise.all(
        CHECKS.map(async ({ id }) => {
          const startedAt = Date.now();
          startedRef.current[id] = startedAt;

          setChecks(prev => ({
            ...prev,
            [id]: { status: prev[id].status === 'idle' ? 'running' : prev[id].status },
          }));

          const result = await runCheck(id);
          // Ignore stale results (a previous timeout already resolved).
          if (startedRef.current[id] !== startedAt) return;

          // Enforce 30s timeout per check.
          const elapsed = Date.now() - startedAt;
          if (elapsed >= RUN_TIMEOUT && result.status === 'running') {
            setChecks(prev => ({
              ...prev,
              [id]: { status: 'unhealthy', detail: 'Service did not respond — see logs' },
            }));
            return;
          }

          setChecks(prev => ({ ...prev, [id]: result }));
        }),
      );
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Update aggregate flags.
  useEffect(() => {
    const vals = Object.values(checks);
    setAllGreen(vals.every(c => c.status === 'healthy'));
    setAnyRed(vals.some(c => c.status === 'unhealthy'));
  }, [checks]);

  function handleContinue() {
    setOnboardedCookie();
    setRedirecting(true);
    window.location.href = '/login';
  }

  const greenCount = Object.values(checks).filter(c => c.status === 'healthy').length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0d] p-4">
      <Card padding="lg" className="w-full max-w-2xl border border-[#1e2130]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-slate-200 mb-1">FIDScript is installed</div>
          <div className="text-sm text-slate-500">
            Let&apos;s confirm everything is healthy before you get started.
          </div>
        </div>

        {/* Health rows */}
        <div className="space-y-2 mb-8">
          {CHECKS.map(({ id, label, why, docsAnchor }) => {
            const check = checks[id];
            const badgeStatus = check.status === 'idle' ? 'idle'
              : check.status === 'running' ? 'running'
              : check.status === 'healthy' ? 'healthy'
              : 'unhealthy';

            return (
              <div
                key={id}
                className="flex items-center gap-4 p-4 rounded-lg bg-[#0f1117] border border-[#1e2130]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{why}</div>
                  {check.detail && (
                    <div className="text-xs text-red-400 mt-1 truncate">{check.detail}</div>
                  )}
                </div>
                <HealthBadge status={badgeStatus} />
              </div>
            );
          })}
        </div>

        {/* All-green banner */}
        {allGreen && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800 text-center text-sm text-emerald-300">
            {greenCount}/{CHECKS.length} checks passing — platform is 100% ready.
          </div>
        )}

        {/* Continue buttons */}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            disabled={!allGreen || redirecting}
            onClick={handleContinue}
            className="w-full"
          >
            {redirecting ? 'Redirecting…' : 'Continue to login'}
          </Button>

          {anyRed && !allGreen && (
            <Button
              variant="ghost"
              disabled={redirecting}
              onClick={handleContinue}
              className="w-full text-slate-500 text-sm"
            >
              Continue anyway
            </Button>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Need help?{' '}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400"
          >
            View the docs
          </a>
        </p>
      </Card>
    </div>
  );
}
