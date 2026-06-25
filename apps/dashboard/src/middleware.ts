import { NextRequest, NextResponse } from 'next/server';

const CACHE_TTL_MS = 8_000;

// Internal API base — always use Docker internal network, not the external hostname.
// This runs inside the dashboard container so fidscript_api is DNS-resolvable.
const INTERNAL_API = 'http://fidscript_api:3001';

interface CacheEntry<T> { value: T; timestamp: number }

function getCacheMap<T>() {
  const key = `__middleware_cache__`;
  const existing = (globalThis as Record<string, unknown>)[key];
  if (existing instanceof Map) return existing as Map<string, CacheEntry<T>>;
  const map = new Map<string, CacheEntry<T>>();
  (globalThis as Record<string, unknown>)[key] = map;
  return map;
}

async function fetchInstallation() {
  const cache = getCacheMap<unknown>();
  const now = Date.now();

  const cachedLifecycle = cache.get('lifecycle');
  if (cachedLifecycle && now - cachedLifecycle.timestamp < CACHE_TTL_MS) {
    return {
      lifecycle: cachedLifecycle.value as string,
      platformDomain: (cache.get('platformDomain')?.value as string) ?? null,
    };
  }

  let lifecycle: string | null = null;
  let platformDomain: string | null = null;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${INTERNAL_API}/api/v1/installation/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json() as { lifecycle?: string };
      lifecycle = json.lifecycle ?? null;
    }
  } catch { /* fail open */ }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${INTERNAL_API}/api/v1/installation/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json() as { platformDomain?: string };
      platformDomain = json.platformDomain ?? null;
    }
  } catch { /* not fatal */ }

  cache.set('lifecycle', { value: lifecycle ?? 'UNKNOWN', timestamp: now });
  if (platformDomain) cache.set('platformDomain', { value: platformDomain, timestamp: now });

  return { lifecycle, platformDomain };
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get('host') ?? '';

  // API routes — always pass through
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // /setup and /onboarding — always accessible (both are installation entry points)
  if (pathname === '/setup' || pathname === '/onboarding') return NextResponse.next();

  // Skip static assets
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') return NextResponse.next();

  const { lifecycle, platformDomain } = await fetchInstallation();

  // Request host matches the configured platform domain → serve landing at /home
  // e.g. someone visits deploy.fidscript.com → redirect to /home (landing page)
  if (platformDomain && host === platformDomain) {
    if (pathname === '/' || pathname === '') {
      const url = req.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Everything else (app subdomain or unknown host) → dashboard
  // Gate on lifecycle so UNCONFIGURED → /setup
  if (lifecycle === 'UNCONFIGURED' || lifecycle === 'CONFIGURING' || lifecycle === 'FAILED') {
    if (pathname !== '/setup') {
      const url = req.nextUrl.clone();
      url.pathname = '/setup';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
