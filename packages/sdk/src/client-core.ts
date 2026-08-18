import axios, { AxiosInstance, AxiosError, AxiosHeaders } from 'axios';
import { FidscriptError } from './modules/errors';
import { mapError, withRetry } from './client-errors';

// No hardcoded default — the caller (createFidscript) must pass a baseURL.
// This is an open source SDK: every consumer picks their own API host.
export interface FidscriptClientOptions {
  /**
   * Credentials for authenticating with the FIDScript API.
   *
   * Two shapes are supported:
   *   - `{ type: 'jwt', token }`   → sent as `Authorization: Bearer <jwt>`
   *   - `{ type: 'apiKey', key }`  → sent as `X-API-Key: fpk_... or fsk_...`
   *
   * A shorthand `apiKey` string is also accepted: values starting with `fpk_`
   * or `fsk_` are routed to the X-API-Key header; anything else (e.g. a JWT)
   * is sent as a Bearer token. This keeps callers from having to know which
   * header applies.
   */
  apiKey?: string | ApiCredential;
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

/** Discriminated auth credential. Either a dashboard JWT or a project API key. */
export type ApiCredential =
  | { type: 'jwt'; token: string }
  | { type: 'apiKey'; key: string };

/**
 * Pick the right auth header for a credential. API keys (fpk_* / fsk_*) travel
 * in X-API-Key; JWTs travel in Authorization: Bearer. Anything else defaults to
 * Bearer — the SDK can't tell a JWT from a random opaque token, but Bearer is
 * the convention for non-API-key secrets.
 */
function credentialHeaders(cred: ApiCredential): Record<string, string> {
  if (cred.type === 'apiKey') return { 'X-API-Key': cred.key };
  return { Authorization: `Bearer ${cred.token}` };
}

/**
 * Normalize the loose `apiKey?: string` input into a discriminated credential.
 * Strings starting with `fpk_` (project API keys) or `fsk_` (account API keys)
 * are routed as API key credentials; everything else is treated as a Bearer
 * token (the typical case being a dashboard JWT, but the API will decide).
 */
function normalizeCredential(input: string | ApiCredential | undefined): ApiCredential | undefined {
  if (!input) return undefined;
  if (typeof input !== 'string') return input;
  if (input.startsWith('fpk_') || input.startsWith('fsk_')) return { type: 'apiKey', key: input };
  return { type: 'jwt', token: input };
}

export class FidscriptClient {
  private readonly http: AxiosInstance;
  private readonly maxRetries: number;
  /** The API base URL this client targets. Exposed for modules that need to
   *  make direct fetch calls (e.g. log ingest, which uses an API key header
   *  instead of the bearer token). Read-only — never reassigned. */
  public readonly baseURL: string;
  /** The active credential, or undefined for an anonymous client. Used by
   *  helpers like `streamGet` that bypass the axios instance. */
  private readonly credential: ApiCredential | undefined;

  constructor(options: FidscriptClientOptions) {
    if (!options.baseURL) {
      throw new Error('FidscriptClient: baseURL is required. Pass it to createFidscript({ baseURL }).');
    }
    this.baseURL = options.baseURL;
    this.credential = normalizeCredential(options.apiKey);
    this.maxRetries = options.maxRetries ?? 3;

    const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.credential) Object.assign(baseHeaders, credentialHeaders(this.credential));

    this.http = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 30_000,
      headers: baseHeaders,
    });

    // Transparent token refresh: on a 401, ask the host app for a fresh access
    // token and retry the original request once. Concurrent 401s share a single
    // refresh. Only meaningful for JWT credentials — API keys don't expire the
    // same way (the server returns 401 if the key is revoked, which the caller
    // must handle by creating a new client).
    if (options.onUnauthorized && this.credential?.type === 'jwt') {
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
    // Build the auth header directly so fpk_/fsk_ keys go to X-API-Key and JWTs
    // to Authorization: Bearer. The axios default headers would otherwise send
    // everything as Bearer, which the API rejects for API keys.
    const headers: Record<string, string> = {};
    if (this.credential) Object.assign(headers, credentialHeaders(this.credential));
    const response = await fetch(url.toString(), { headers });
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