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

export function getNextRoute(): string {
  if (typeof window === 'undefined') return '/projects';
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/projects';
}
