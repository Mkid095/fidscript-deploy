import axios, { AxiosInstance, AxiosError, AxiosHeaders } from 'axios';
import { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError } from './modules/errors';

// No hardcoded default — the caller (createFidscript) must pass a baseURL.
// This is an open source SDK: every consumer picks their own API host.
export interface FidscriptClientOptions {
  apiKey?: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  /**
   * Invoked once when an authenticated request receives 401 Unauthorized. If it
   * resolves to a new access token, the failed request is retried once with that
   * token (and the client's default Authorization header is updated so subsequent
   * calls use it). If it resolves to null, the original 401 is re-thrown.
   *
   * Use this to wire a transparent refresh-token flow without touching every
   * call site (e.g. the dashboard refreshes its JWT when the short-lived
   * access token expires mid-session). Concurrent 401s coalesce into a single
   * refresh so a burst of expired-token errors triggers exactly one refresh.
   */
  onUnauthorized?: () => Promise<string | null>;
}

function mapError(err: unknown): never {
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

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
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

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export { FidscriptError, AuthError, NotFoundError, ValidationError, RateLimitError, sleep };

export class FidscriptClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  /** The API base URL this client targets. Exposed for modules that need to
   *  make direct fetch calls (e.g. log ingest, which uses an API key header
   *  instead of the bearer token). Read-only — never reassigned. */
  public readonly baseURL: string;

  constructor(options: FidscriptClientOptions) {
    if (!options.baseURL) {
      throw new Error('FidscriptClient: baseURL is required. Pass it to createFidscript({ baseURL }).');
    }
    this.baseURL = options.baseURL;
    this.maxRetries = options.maxRetries ?? 3;
    this.http = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30_000,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
    });

    // Transparent token refresh: on a 401, ask the host app for a fresh access
    // token and retry the original request once. Concurrent 401s share a single
    // refresh. `_retried` guards against loops.
    if (options.onUnauthorized) {
      const refresh = options.onUnauthorized;
      let pending: Promise<string | null> | null = null;
      this.http.interceptors.response.use(
        (resp) => resp,
        async (error: AxiosError) => {
          const cfg = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
          if (error.response?.status === 401 && cfg && !cfg._retried) {
            cfg._retried = true;
            if (!pending) pending = refresh().finally(() => { pending = null; });
            const newToken = await pending;
            if (newToken) {
              this.http.defaults.headers.common.Authorization = `Bearer ${newToken}`;
              (cfg.headers as AxiosHeaders).set('Authorization', `Bearer ${newToken}`);
              return this.http.request(cfg);
            }
          }
          return Promise.reject(error);
        },
      );
    }
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return withRetry(
      () => this.http.get<T>(path, { params }).then(r => r.data).catch(mapError),
      this.maxRetries,
    );
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    return withRetry(
      () => this.http.post<T>(path, data).then(r => r.data).catch(mapError),
      this.maxRetries,
    );
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    return withRetry(
      () => this.http.put<T>(path, data).then(r => r.data).catch(mapError),
      this.maxRetries,
    );
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    return withRetry(
      () => this.http.patch<T>(path, data).then(r => r.data).catch(mapError),
      this.maxRetries,
    );
  }

  async delete<T>(path: string, data?: unknown): Promise<T> {
    return withRetry(
      () => this.http.delete<T>(path, { data }).then(r => r.data).catch(mapError),
      this.maxRetries,
    );
  }

  async *streamGet<T>(path: string, params?: Record<string, unknown>): AsyncGenerator<T> {
    const baseURL = this.baseURL;
    if (!baseURL) throw new FidscriptError('No baseURL configured');
    const url = new URL(baseURL + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    const response = await fetch(url.toString(), {
      headers: this.http.defaults.headers.common as Record<string, string>,
    });
    if (!response.ok) throw mapError(new AxiosError(response.statusText, String(response.status)));
    const reader = response.body?.getReader();
    if (!reader) throw new FidscriptError('Response body is not readable');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) yield JSON.parse(line) as T;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
