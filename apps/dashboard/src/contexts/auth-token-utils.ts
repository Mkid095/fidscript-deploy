// Token storage utilities — kept separate to keep auth-provider.tsx under 150 lines

export const ACCESS_TOKEN_KEY = 'fidscript_access_token';
export const REFRESH_TOKEN_KEY = 'fidscript_refresh_token';
// Legacy alias — some pages read this key directly
export const LEGACY_TOKEN_KEY = 'fidscript_token';

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Where a login may send the person afterwards.
 *
 * Only a path inside this platform is a destination. A `next` that names
 * another site — `https://elsewhere.example`, or `//elsewhere.example`, or
 * a backslash that a browser reads as a slash — is not a route here, and
 * following it would turn the login into a convincing front door for
 * somebody else's site.
 */
export function safeNextRoute(next: string | null | undefined): string | null {
  if (!next) return null;
  const route = next.trim();
  if (!route.startsWith('/')) return null;
  // `//host` and `/\host` both leave the site; a backslash is a slash to
  // a browser, so it is refused outright.
  if (route.startsWith('//') || route.includes('\\')) return null;
  // Control characters have no business in a route.
  if (/[\x00-\x1f\x7f]/.test(route)) return null;
  return route;
}

export function getNextRoute(): string {
  // The Applications screen is where an operator arrives: it is the answer
  // to "what can this platform do for me". A `next` parameter still wins —
  // someone who was sent to a specific page goes there.
  if (typeof window === 'undefined') return '/applications';
  const params = new URLSearchParams(window.location.search);
  return safeNextRoute(params.get('next')) ?? '/applications';
}
