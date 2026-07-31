/**
 * Single source of truth for the API base URL and SDK mode.
 *
 * All SDK calls go through our Next.js proxy route at /api/v1/* to avoid CORS
 * issues. The proxy is defined at src/app/api/v1/[...path]/route.ts and
 * forwards to the API container at http://api:3001 internally.
 */
import { createFidscript, type FidscriptSDK } from '@fidscript-deploy/sdk';

// Use a relative URL so all calls route through our /api/v1/* proxy.
// The proxy adds CORS headers for https://deploy.fidscript.com.
export const API_BASE_URL = '';

// localStorage key constants — kept in sync with contexts/auth-context.tsx.
const ACCESS_TOKEN_KEY = 'fidscript_access_token';
const REFRESH_TOKEN_KEY = 'fidscript_refresh_token';
const LEGACY_TOKEN_KEY = 'fidscript_token';

/**
 * Refresh the access token using the stored refresh token. Called by the SDK's
 * 401 interceptor (transparent refresh) — uses a raw fetch (not the SDK) so it
 * bypasses the interceptor entirely and cannot recurse. Returns the new access
 * token, or null if there is no refresh token / refresh failed (in which case
 * we clear the session and force re-login).
 */
async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error(`refresh status ${res.status}`);
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken) throw new Error('refresh returned no accessToken');
    window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    window.localStorage.setItem(LEGACY_TOKEN_KEY, data.accessToken);
    if (data.refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return data.accessToken;
  } catch {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Refresh token is also dead — force re-login (skip if already there).
    if (window.location.pathname !== '/login') window.location.href = '/login';
    return null;
  }
}

export function makeSdk(_apiKey?: string): FidscriptSDK {
  // Wire transparent token refresh so mid-session access-token expiry (15 min)
  // no longer 401s every call until a full page reload.
  return createFidscript({ baseURL: API_BASE_URL, apiKey: _apiKey, onUnauthorized: refreshAccessToken });
}
