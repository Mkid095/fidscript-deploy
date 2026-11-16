import 'server-only';

import { cookies } from 'next/headers';

import { ApiError, messageFrom } from './errors';

/**
 * The server's way in.
 *
 * The server reads the session cookie and calls the API itself, with the
 * bearer attached. The browser never sees the token — it is httpOnly, and
 * this is the only place it is used.
 */

const ACCESS_COOKIE = 'fidscript_access';
/**
 * The server-side calls prefer the **internal** route when the platform
 * knows one (`API_INTERNAL_URL`, e.g. `http://fidscript_api:3001`): the
 * public name goes out through the edge and back, and a slow round-trip
 * on every server component's fetch is the whole interface feeling slow.
 *
 * The read goes through a local alias on purpose: `process.env.NEXT_PUBLIC_*`
 * is baked into the bundle at build time, and a plain `process.env.X ?? …`
 * chain with an unknown build-time value gets folded by the minifier to the
 * baked-in literal — which is how a previous build lost the internal-route
 * lookup entirely. Through an opaque identifier, the env read survives to
 * runtime, where `API_INTERNAL_URL` is set by the deployment.
 */
const env = process.env;
const API_URL =
  env.API_INTERNAL_URL ??
  env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

const REFRESH_COOKIE = 'fidscript_refresh';
/** The access token's life, in the browser's own clock — the middleware's. */
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  };
}

/**
 * The access token is short-lived, and the middleware renews it on the
 * page's way in. An action's call that still carries an expired token is a
 * 401 the person should not see: the session is still good, the token is
 * only old. The refresh spends the session's refresh token once — the new
 * pair replaces the cookies, and the call is made one more time.
 */
async function renewSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!body.accessToken) return null;
    return {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken ?? refreshToken,
    };
  } catch {
    return null;
  }
}

async function serverRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | undefined>;
    /** Headers the API needs and the session does not carry — the setup token. */
    headers?: Record<string, string>;
  } = {},
  retried = false,
): Promise<T> {
  const { method = 'GET', body, query, headers } = options;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.append(key, value);
  }
  const suffix = search.toString() ? `?${search}` : '';

  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;

  const response = await fetch(`${API_URL}/api/v1${path}${suffix}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      // The token the call carried is not good. If the session itself is
      // still good, the refresh makes a new pair and the call is made
      // once more; the person is never asked to sign in for an old token.
      const refreshValue = store.get(REFRESH_COOKIE)?.value;
      if (refreshValue) {
        const renewed = await renewSession(refreshValue);
        if (renewed) {
          try {
            store.set(ACCESS_COOKIE, renewed.accessToken, cookieOptions(ACCESS_MAX_AGE));
            store.set(
              REFRESH_COOKIE,
              renewed.refreshToken,
              cookieOptions(REFRESH_MAX_AGE),
            );
          } catch {
            // The context does not allow the cookies to change. The spent
            // refresh token means the session cannot be kept, and a half
            // session is worse than a clean sign-in: take both off.
            try {
              store.delete(ACCESS_COOKIE);
              store.delete(REFRESH_COOKIE);
            } catch {
              // The response carries what it carries.
            }
            throw new ApiError('Your session has ended. Sign in again.', 401);
          }
          return serverRequest<T>(path, options, true);
        }
        // The refresh is refused: the session is genuinely over, and the
        // old pair stays only until the next page's way in takes it off.
        try {
          store.delete(ACCESS_COOKIE);
          store.delete(REFRESH_COOKIE);
        } catch {
          // The response carries what it carries.
        }
        throw new ApiError('Your session has ended. Sign in again.', 401);
      }
      throw new ApiError('Your session has ended. Sign in again.', 401);
    }

    const { message, code } = messageFrom(payload, response.status);
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const serverApi = {
  get: <T>(path: string, query?: Record<string, string | undefined>) =>
    serverRequest<T>(path, { query }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    serverRequest<T>(path, { method: 'POST', body, headers }),
  patch: <T>(path: string, body?: unknown) =>
    serverRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => serverRequest<T>(path, { method: 'DELETE' }),
};
