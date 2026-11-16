import { ApiError, messageFrom } from './errors';

/**
 * The browser's way in.
 *
 * Every call goes to the console's own proxy at `/console/api/v1/*`, which
 * carries the session cookie, attaches the bearer, and refreshes on a 401.
 * **The browser never holds a token** — it cannot, because the tokens are
 * httpOnly cookies and the proxy moves them out of the response body.
 *
 * The proxy has a path of its own rather than `/api/v1`: the platform's
 * API answers on `/api/*` at the root domain too, and the console's proxy
 * must not be mistaken for it.
 */
const PROXY = '/console/api/v1';

export async function browserRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${PROXY}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
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

export const browserApi = {
  get: <T>(path: string) => browserRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    browserRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    browserRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => browserRequest<T>(path, { method: 'DELETE' }),
};
