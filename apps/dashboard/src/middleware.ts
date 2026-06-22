import { NextRequest, NextResponse } from 'next/server';

// 30-second in-memory lifecycle cache (survives Next.js hot-reload via globalThis)
const CACHE_TTL_MS = 30_000;
const lifecycleCache = (globalThis as Record<string, unknown>).__lifecycle_cache__ as Map<string, { value: string; timestamp: number }> | undefined;
function getCache() {
  if (!lifecycleCache) {
    (globalThis as Record<string, unknown>).__lifecycle_cache__ = new Map<string, { value: string; timestamp: number }>();
    return (globalThis as Record<string, unknown>).__lifecycle_cache__ as Map<string, { value: string; timestamp: number }>;
  }
  return lifecycleCache;
}

async function getInstallationLifecycle(apiBase: string): Promise<string | null> {
  const cache = getCache();
  const cached = cache.get('lifecycle');
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) return cached.value;

  let lifecycle: string | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 500);
    const res = await fetch(`${apiBase}/api/v1/installation/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json() as { lifecycle?: string };
      lifecycle = json.lifecycle ?? null;
    }
  } catch { /* fail open */ }

  cache.set('lifecycle', { value: lifecycle ?? 'UNKNOWN', timestamp: now });
  return lifecycle;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // API routes — always pass through
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // /setup — always accessible
  if (pathname === '/setup') return NextResponse.next();

  // Skip static assets
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') return NextResponse.next();

  // Determine the API base from the request
  const protocol = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? '';
  const apiBase = `${protocol}://${host}`;

  const lifecycle = await getInstallationLifecycle(apiBase);

  // UNCONFIGURED / CONFIGURING → redirect everything non-API to /setup
  if (lifecycle === 'UNCONFIGURED' || lifecycle === 'CONFIGURING') {
    if (pathname !== '/setup') {
      const url = req.nextUrl.clone();
      url.pathname = '/setup';
      return NextResponse.redirect(url);
    }
  }

  // CONFIGURED → let through normally
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
