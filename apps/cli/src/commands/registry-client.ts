/**
 * The registry client — the HTTP the npm registry speaks.
 *
 * This is the CLI's own client: it talks to the registry directly, the way
 * npm does, rather than going through the MCP server. The operations mirror
 * the registry's documented endpoints (`/-/whoami`, `/-/v1/search`,
 * `/-/user/org.couchdb.user:<name>`, and the packument at `/<name>`).
 */

export interface RegistryClient {
  registryUrl: string;
  token?: string;
}

export interface RegistryResponse {
  status: number;
  text: string;
  json: unknown;
}

export interface PackumentVersion {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  repository?: unknown;
  license?: unknown;
  keywords?: string[];
  dist?: { tarball?: string; shasum?: string };
  deprecated?: string;
  time?: string;
}

export interface Packument {
  name: string;
  description?: string;
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, PackumentVersion>;
  time?: Record<string, string>;
}

/** One HTTP call against the registry. */
export async function request(
  client: RegistryClient,
  method: string,
  path: string,
  body?: string,
  contentType?: string,
): Promise<RegistryResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'fidscript-cli',
  };
  if (client.token) headers.Authorization = `Bearer ${client.token}`;
  if (body !== undefined) {
    headers['Content-Type'] = contentType ?? 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(body));
  }

  let res: Response;
  try {
    res = await fetch(`${client.registryUrl}${path}`, { method, headers, body });
  } catch (err) {
    throw new Error(`Could not reach the registry at ${client.registryUrl}: ${(err as Error).message}`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

/** The account the token belongs to. */
export async function whoami(client: RegistryClient): Promise<string> {
  const res = await request(client, 'GET', '/-/whoami');
  if (res.status === 401) throw new Error('The registry rejected the token — log in again.');
  if (res.status !== 200) throw new Error(`The registry answered ${res.status}: ${res.text}`);
  const body = res.json as { username?: string } | null;
  if (!body?.username) throw new Error('The registry did not say who the token belongs to.');
  return body.username;
}

/** The packages the account owns. */
export async function listMyPackages(client: RegistryClient): Promise<string[]> {
  const username = await whoami(client);
  const res = await request(client, 'GET', `/-/user/org.couchdb.user:${encodeURIComponent(username)}`);
  if (res.status !== 200) throw new Error(`The registry answered ${res.status}: ${res.text}`);
  const body = res.json as { packages?: unknown } | null;
  const packages = body?.packages;
  if (!Array.isArray(packages)) return [];
  return packages
    .map((entry) => (typeof entry === 'string' ? entry : (entry as { name?: string })?.name ?? ''))
    .filter((name) => name.length > 0);
}

/** The full packument for a package. */
export async function getPackument(client: RegistryClient, name: string): Promise<Packument> {
  const res = await request(client, 'GET', `/${encodeName(name)}`);
  if (res.status === 404) throw new Error(`The registry has no package called "${name}".`);
  if (res.status !== 200) throw new Error(`The registry answered ${res.status}: ${res.text}`);
  return res.json as Packument;
}

/** The versions of a package, newest first. */
export async function listVersions(client: RegistryClient, name: string): Promise<string[]> {
  const packument = await getPackument(client, name);
  const versions = Object.keys(packument.versions ?? {});
  const times = packument.time ?? {};
  return versions.sort((a, b) => (times[b] ?? '').localeCompare(times[a] ?? ''));
}

/** Search the registry. */
export async function searchPackages(
  client: RegistryClient,
  query: string,
  size = 20,
): Promise<Array<{ name: string; version: string; description?: string; date?: string }>> {
  const res = await request(
    client,
    'GET',
    `/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`,
  );
  if (res.status !== 200) throw new Error(`The registry answered ${res.status}: ${res.text}`);
  const body = res.json as { objects?: Array<{ package?: Record<string, unknown> }> } | null;
  return (body?.objects ?? []).map((entry) => {
    const pkg = entry.package ?? {};
    return {
      name: String(pkg.name ?? ''),
      version: String(pkg.version ?? ''),
      description: pkg.description ? String(pkg.description) : undefined,
      date: pkg.date ? String(pkg.date) : undefined,
    };
  });
}

/** A package name with its scope kept readable: `@scope/name` → `@scope%2fname`. */
export function encodeName(name: string): string {
  return name.startsWith('@') ? name.replace('/', '%2f') : encodeURIComponent(name);
}
