import 'server-only';

import { getPlatformDomain } from './platform';

/**
 * The package registry.
 *
 * The registry is the platform's — it is where the published packages live,
 * and where an application publishes its own. The console reads it directly:
 * it is a registry, and it answers the same way to everybody.
 */

export interface RegistryPackage {
  name: string;
  description?: string;
  latest?: string;
  versions: string[];
}

// The registry's name resolves to IPv6 first, and a container without an
// IPv6 route times out on every fetch — so the answer order is set where
// the fetch happens, not left to the runtime's default.
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

/** The registry's address. */
export async function getRegistryUrl(): Promise<string | null> {
  const domain = await getPlatformDomain();
  return domain ? `https://registry.${domain}` : null;
}

/**
 * The address the server **fetches** from.
 *
 * The public name goes out through the edge and back, and its catalogue
 * answer trickles — so when the deployment knows the registry's own address
 * on the shared network (`REGISTRY_INTERNAL_URL`, e.g.
 * `http://nextmavens-verdaccio:4873`) that is the one the fetch uses. The
 * public name is still what a person copies for their own `npm`; that is
 * what `getRegistryUrl` is for. Read through an opaque alias, the same way
 * the API's address is: a plain `process.env.X ?? …` chain would fold to
 * the build-time literal and the internal route would never be seen.
 */
export async function getRegistryFetchUrl(): Promise<string | null> {
  const env = process.env;
  if (env.REGISTRY_INTERNAL_URL) return env.REGISTRY_INTERNAL_URL;
  return getRegistryUrl();
}

/**
 * What the registry holds.
 *
 * The list comes from the registry itself, so it is what is really
 * published — not what the platform remembers.
 */
export async function getPublishedPackages(
  registryUrl: string,
): Promise<{ packages: RegistryPackage[]; reachable: boolean }> {
  try {
    const response = await fetch(`${registryUrl}/-/all`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { packages: [], reachable: false };

    const body = (await response.json()) as Record<
      string,
      {
        name?: string;
        description?: string;
        'dist-tags'?: { latest?: string };
        versions?: Record<string, unknown>;
      }
    >;

    const packages: RegistryPackage[] = Object.values(body)
      .filter((entry) => entry?.name)
      .map((entry) => ({
        name: entry.name as string,
        description: entry.description,
        latest: entry['dist-tags']?.latest,
        versions: Object.keys(entry.versions ?? {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { packages, reachable: true };
  } catch {
    return { packages: [], reachable: false };
  }
}

/**
 * One package, and everything the registry knows about it.
 *
 * The registry answers with the manifest: the versions, the tags, and the
 * README the package was published with.
 */
export async function getRegistryPackage(
  registryUrl: string,
  name: string,
): Promise<{
  name: string;
  description?: string;
  latest?: string;
  tags: Record<string, string>;
  versions: string[];
  readme?: string;
} | null> {
  try {
    const response = await fetch(
      `${registryUrl}/${encodeURIComponent(name).replace('%40', '@')}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;

    const body = (await response.json()) as {
      name?: string;
      description?: string;
      'dist-tags'?: Record<string, string>;
      versions?: Record<string, { version?: string }>;
      readme?: string;
    };

    const versions = Object.values(body.versions ?? {})
      .map((entry) => entry.version ?? '')
      .filter(Boolean)
      .sort()
      .reverse();

    return {
      name: body.name ?? name,
      description: body.description,
      latest: body['dist-tags']?.latest,
      tags: body['dist-tags'] ?? {},
      versions,
      readme: body.readme,
    };
  } catch {
    return null;
  }
}
