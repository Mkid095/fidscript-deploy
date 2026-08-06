import axios, { AxiosError } from 'axios';
import { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError } from './modules/errors';

/**
 * Maps a thrown axios / axios-shaped error to the SDK's typed error hierarchy.
 * Public so client-core can use it for native fetch failures too.
 */
export function mapError(err: unknown): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : err.message;

    if (status === 401) throw new AuthError(message);
    if (status === 404) throw new NotFoundError('Resource', err.config?.url ?? 'unknown');
    if (status === 422) throw new ValidationError(message);
    if (status === 429) {
      const retryAfter = err.response?.headers?.['retry-after'] as string | undefined;
      const ms = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
      throw new RateLimitError(ms);
    }
    throw new FidscriptError(message, status, data?.code as string | undefined);
  }
  if (err instanceof FidscriptError) throw err;
  throw new FidscriptError((err as Error).message);
}

/**
 * Wraps an async request in exponential-backoff retry. Retries on transient
 * server errors (429, 5xx) and any non-FidscriptError (network) failures.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let last: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err as Error;
      const isRetryable =
        err instanceof FidscriptError
          ? [429, 500, 502, 503, 504].includes(err.statusCode ?? 0)
          : true;
      if (attempt < maxRetries && isRetryable) {
        await sleep(attempt * attempt * 200);
        continue;
      }
    }
  }
  throw last!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
