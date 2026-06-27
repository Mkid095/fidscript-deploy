/**
 * Single source of truth for the API base URL.
 *
 * The Docker build sets NEXT_PUBLIC_API_URL as a build arg (see
 * apps/dashboard/Dockerfile). At runtime, this is the only place the
 * dashboard reads it — every createFidscript call goes through here.
 *
 * If the URL is missing, that's a build configuration error and we throw
 * with a clear message instead of silently using a hardcoded fallback.
 */
import { createFidscript, type FidscriptSDK } from '@fidscript/sdk';

const RAW_URL = process.env.NEXT_PUBLIC_API_URL;

if (!RAW_URL) {
  // Surface the error in the browser console early; createFidscript will
  // also throw with the missing baseURL message when actually called.
  // eslint-disable-next-line no-console
  console.error('[sdk] NEXT_PUBLIC_API_URL is not set — check the dashboard Docker build args.');
}

// Strip trailing /api since the SDK prepends /api/v1 to every route.
// Dashboard build arg: https://deploy.fidscript.com/api  →  axios baseURL: https://deploy.fidscript.com
export const API_BASE_URL = RAW_URL?.replace(/\/api$/, '') ?? '';

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
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
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

export function makeSdk(apiKey?: string): FidscriptSDK {
  if (!API_BASE_URL) {
    throw new Error(
      'API base URL is not configured. The dashboard was built without NEXT_PUBLIC_API_URL — ' +
      'rebuild with --build-arg NEXT_PUBLIC_API_URL=https://your-api-host/api.',
    );
  }
  // Wire transparent token refresh so mid-session access-token expiry (15 min)
  // no longer 401s every call until a full page reload.
  return createFidscript({ baseURL: API_BASE_URL, apiKey, onUnauthorized: refreshAccessToken });
}
