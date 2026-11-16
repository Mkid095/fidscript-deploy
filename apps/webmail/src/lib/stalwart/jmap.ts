/**
 * The Stalwart JMAP client.
 *
 * One server, two kinds of callers:
 *   - the admin (the recovery-admin credential) — talks the `x:` management
 *     methods under `urn:stalwart:jmap`, and user-scoped methods for its
 *     own account;
 *   - a mailbox user — their own Basic credential, user-scoped methods only.
 *
 * This is a thin, honest client: it batches method calls, reads the
 * response envelope, and surfaces per-call errors instead of pretending
 * they did not happen. Nothing here caches results; the server is the
 * source of truth and we ask it each time.
 */
import { stalwartAdmin, stalwartUrl } from '@/lib/env';

export class StalwartError extends Error {
  constructor(
    public readonly method: string,
    public readonly type: string,
    message: string,
  ) {
    super(`${method}: ${type} — ${message}`);
    this.name = 'StalwartError';
  }
}

interface Credentials {
  user: string;
  pass: string;
}

export interface JmapReply {
  sessionState: string | null;
  /** The results of the calls, in order, unwrapped to their objects. */
  results: Array<Record<string, unknown>>;
}

type MethodCall = [string, Record<string, unknown>, string];

export class StalwartClient {
  private readonly auth: string | undefined;
  /** The Stalwart root (JMAP at `{base}/jmap`, upload at `{base}/jmap/upload/`). */
  readonly baseURL: string;
  /** The JMAP request endpoint, e.g. `{base}/jmap`. */
  private readonly endpoint: string;
  /** The JMAP upload endpoint, e.g. `{base}/jmap/upload/`. */
  private readonly uploadEndpoint: string;

  constructor(
    baseURL: string = stalwartUrl(),
    credentials?: Credentials,
  ) {
    this.baseURL = baseURL;
    this.endpoint = `${this.baseURL}/jmap`;
    this.uploadEndpoint = `${this.baseURL}/jmap/upload/`;
    if (credentials && credentials.user) {
      this.auth = `Basic ${Buffer.from(
        `${credentials.user}:${credentials.pass}`,
      ).toString('base64')}`;
    }
  }

  /** The Authorization header this client sends, if it has credentials. */
  get authHeader(): string | undefined {
    return this.auth;
  }

  /**
   * Run a batch of method calls. The `using` capability list says which
   * method families are in play; the standard mail methods need
   * `urn:ietf:params:jmap:mail`, the admin `x:` ones need
   * `urn:stalwart:jmap`.
   */
  async call(
    calls: Array<[string, Record<string, unknown>]>,
    using: string[] = [
      'urn:ietf:params:jmap:core',
      'urn:ietf:params:jmap:mail',
      'urn:ietf:params:jmap:submission',
      'urn:ietf:params:jmap:vacationresponse',
      'urn:ietf:params:jmap:sieve',
      'urn:ietf:params:jmap:contacts',
      'urn:stalwart:jmap',
    ],
  ): Promise<JmapReply> {
    const payload: Record<string, unknown> = { using };
    const methodCalls: MethodCall[] = calls.map(([method, args], i) => [
      method,
      args,
      String(i),
    ]);
    payload.methodCalls = methodCalls;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.auth ? { Authorization: this.auth } : {}),
      },
      body: JSON.stringify(payload),
      // Stalwart answers quickly on the internal network; 15s is generous
      // without hanging a page on a dead server.
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // 401/403 means the credential did not work — say so, plainly.
      if (response.status === 401 || response.status === 403) {
        throw new StalwartError(methodCalls[0][0], 'auth', 'not authorized');
      }
      throw new StalwartError(
        methodCalls[0][0],
        'transport',
        `HTTP ${response.status} from ${this.endpoint}`,
      );
    }

    const body = (await response.json()) as {
      sessionState?: string;
      methodResponses?: Array<[string, Record<string, unknown>, string]>;
    };

    const responses = body.methodResponses ?? [];
    const results: Array<Record<string, unknown>> = new Array(methodCalls.length);
    // A failed call comes back as ["error", { type, description }, tag] —
    // the tag is the caller's, so we know which call it was.
    const failures: Array<{ index: number; type: string; description: string }> = [];
    for (const [name, result, tag] of responses) {
      const index = Number(tag);
      if (name === 'error') {
        failures.push({
          index,
          type: String(result.type ?? 'unknown'),
          description: String(result.description ?? ''),
        });
      } else {
        results[index] = result;
      }
    }
    if (failures.length) {
      const failure = failures[0];
      throw new StalwartError(
        methodCalls[failure.index][0],
        failure.type,
        failure.description,
      );
    }
    for (let i = 0; i < methodCalls.length; i++) {
      if (results[i] === undefined) {
        throw new StalwartError(
          methodCalls[i][0],
          'missing',
          'no result in the reply for this call',
        );
      }
    }
    return { sessionState: body.sessionState ?? null, results };
  }

  /** A single call, unwrapped to its own result. */
  async one<T = Record<string, unknown>>(
    method: string,
    args: Record<string, unknown> = {},
    using?: string[],
  ): Promise<T> {
    const reply = await this.call([[method, args]], using);
    return reply.results[0] as T;
  }

  /**
   * Upload a binary and get its blob id (JMAP Upload, RFC 8620).
   *
   * Stalwart scopes blobs to the JMAP account, so the account's own
   * upload path is used: `{base}/jmap/upload/{accountId}/`. The blob is
   * then referenced from the message's body parts; it is not a message.
   */
  async upload(
    data: ArrayBuffer,
    contentType: string,
    filename?: string,
    accountId?: string,
  ): Promise<{ blobId: string; size: number }> {
    const url = accountId
      ? `${this.baseURL}/jmap/upload/${accountId}/`
      : this.uploadEndpoint;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(this.auth ? { Authorization: this.auth } : {}),
        ...(filename ? { 'Content-Filename': filename } : {}),
      },
      // A Blob keeps the raw bytes without our adding content-encoding
      // to them; the Content-Type header says what they are.
      body: new Blob([data]),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new StalwartError('blob/upload', 'transport', `HTTP ${response.status}`);
    }
    const body = (await response.json()) as { blobId: string; size?: number };
    return { blobId: body.blobId, size: body.size ?? 0 };
  }
}

/** The admin client — the recovery-admin credential, server-side only. */
export function adminClient(): StalwartClient {
  const { user, pass } = stalwartAdmin();
  return new StalwartClient(stalwartUrl(), { user, pass });
}

/** A mailbox-user client, scoped to that user's own data. */
export function userClient(user: string, pass: string): StalwartClient {
  return new StalwartClient(stalwartUrl(), { user, pass });
}

/**
 * The JMAP `accountId` for a user's own data.
 *
 * Stalwart's session does not list it for user-scoped sessions, but it is
 * the directory id of the user's account (`x:Account`), so it is resolved
 * on the admin side and cached per user. (In v0.16 the JMAP account ids
 * are the same values as the `x:Account` ids.)
 */
const accountCache = new Map<string, string>();

export async function resolveAccountId(
  _client: StalwartClient,
  user: string,
  _pass?: string,
): Promise<string> {
  const cached = accountCache.get(user);
  if (cached) return cached;

  const [local, domain] = user.toLowerCase().split('@');
  if (!local || !domain) {
    throw new StalwartError('resolve', 'bad-address', `not an address: ${user}`);
  }
  const admin = adminClient();

  // 1. The domain's directory id (query answers with ids; confirm the name).
  const domainQuery = await admin.one<{ ids: string[] }>(
    'x:Domain/query',
    { filter: { name: domain } },
  );
  if (!domainQuery.ids?.length) {
    throw new StalwartError('resolve', 'no-domain', `no domain ${domain}`);
  }
  const domains = await admin.one<{ list: Array<{ id: string; name: string }> }>(
    'x:Domain/get',
    { ids: domainQuery.ids, properties: ['id', 'name'] },
  );
  const match = (domains.list ?? []).find((row) => row.name === domain);
  if (!match) {
    throw new StalwartError('resolve', 'no-domain', `no domain ${domain}`);
  }

  // 2. The account on that domain with this local part.
  const accountQuery = await admin.one<{ ids: string[] }>(
    'x:Account/query',
    { filter: { name: local, domainId: match.id } },
  );
  if (!accountQuery.ids?.length) {
    throw new StalwartError('resolve', 'no-account', `no account ${user}`);
  }
  const accounts = await admin.one<{ list: Array<{ id: string; name: string; domainId: string }> }>(
    'x:Account/get',
    { ids: accountQuery.ids, properties: ['id', 'name', 'domainId'] },
  );
  const account = (accounts.list ?? []).find(
    (row) => row.name === local && row.domainId === match.id,
  );
  if (!account) {
    throw new StalwartError('resolve', 'no-account', `no account ${user}`);
  }
  accountCache.set(user, account.id);
  return account.id;
}
