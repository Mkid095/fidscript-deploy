/**
 * One request against Instant's dashboard API, with Instant's errors
 * unwrapped into something the platform can act on.
 *
 * Kept out of the client service so the service stays about the platform's
 * intent (create an app, read it, delete it) rather than about HTTP.
 */

/** An error from the Instant API, carrying the HTTP status. */
export class InstantApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'InstantApiError';
  }
}

/**
 * Make a request against the dash API.
 *
 * @param apiHost  the base URL, without a trailing slash
 * @param method   the HTTP method
 * @param path     the path, beginning with a slash
 * @param token    the bearer token — a personal access token for the
 *                 superuser, or an app's admin token for that app
 * @param body     the JSON body, when there is one
 */
export async function instantRequest<T = unknown>(
  apiHost: string,
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  if (!token) {
    throw new InstantApiError(0, 'The platform holds no Instant superuser token.');
  }

  const res = await fetch(`${apiHost}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const payload = text ? safeParse(text) : {};

  if (!res.ok) {
    throw new InstantApiError(res.status, errorMessage(payload, res.statusText));
  }
  return payload as T;
}

/** Instant reports errors under several keys; take whichever is present. */
function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const message = record.error ?? record.message ?? record.detail;
  return typeof message === 'string' && message ? message : fallback;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
