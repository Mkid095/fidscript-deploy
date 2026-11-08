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

async function serverRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | undefined>;
    /** Headers the API needs and the session does not carry — the setup token. */
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = 'GET', body, query, headers } = options;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.append(key, value);
  }
  const suffix = search.toString() ? `?${search}` : '';

  const access = (await cookies()).get(ACCESS_COOKIE)?.value;

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
