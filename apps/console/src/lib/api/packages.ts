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

/** The registry's address. */
export async function getRegistryUrl(): Promise<string | null> {
  const domain = await getPlatformDomain();
  return domain ? `https://registry.${domain}` : null;
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
