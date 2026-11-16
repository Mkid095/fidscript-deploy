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
 *
 * And the list is kept **warm**: the registry's `/-/all` reads every
 * package in its store, and on this machine that answer takes a quarter
 * of a minute. A page's fetch does not wait for it twice, and not even
 * once: the server asks for it on its own (the startup's call, and the
 * stale's), and a page that finds it still unfinished only waits what a
 * page may wait, and says so honestly when the answer is not there yet.
 */

type Catalogue = { packages: RegistryPackage[]; at: number };
const CATALOGUE_TTL = 5 * 60_000;
const COLD_WAIT = 15_000;
let catalogue: Catalogue | null = null;
let inFlight: Promise<void> | null = null;

async function fetchCatalogue(registryUrl: string): Promise<void> {
  try {
    const response = await fetch(`${registryUrl}/-/all`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return;

    const body = (await response.json()) as Record<
      string,
      {
        name?: string;
        description?: string;
        'dist-tags'?: { latest?: string };
        versions?: Record<string, unknown>;
      }
    >;

    catalogue = {
      at: Date.now(),
      packages: Object.values(body)
        .filter((entry) => entry?.name)
        .map((entry) => ({
          name: entry.name as string,
          description: entry.description,
          latest: entry['dist-tags']?.latest,
          versions: Object.keys(entry.versions ?? {}),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch {
    /* The registry did not answer this round; the next one asks again. */
  }
}

/** The one in-flight fetch: a second caller joins it instead of doubling. */
function startRefresh(registryUrl: string): Promise<void> {
  inFlight ??= fetchCatalogue(registryUrl).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function getPublishedPackages(
  registryUrl: string,
): Promise<{ packages: RegistryPackage[]; reachable: boolean }> {
  const age = catalogue ? Date.now() - catalogue.at : Number.POSITIVE_INFINITY;

  if (age < CATALOGUE_TTL) {
    return { packages: catalogue!.packages, reachable: true };
  }

  // Stale: the last true list goes out at once, and the new one is fetched
  // on its own — nobody's page waits for a quarter of a minute it does not
  // need to.
  if (catalogue) {
    void startRefresh(registryUrl);
    return { packages: catalogue.packages, reachable: true };
  }

  // Cold, on the server's first minutes: wait for the answer that is
  // already being fetched, for as long as a page may wait.
  await Promise.race([
    startRefresh(registryUrl),
    new Promise((resolve) => setTimeout(resolve, COLD_WAIT)),
  ]);
  // The race may have finished the fetch; read the answer through a
  // function, because the compiler does not see the mutation through an
  // awaited promise.
  const finished = readCatalogue();
  if (finished) return { packages: finished.packages, reachable: true };
  return { packages: [], reachable: false };
}

/** The catalogue as it stands, read at this moment. */
function readCatalogue(): Catalogue | null {
  return catalogue;
}

/**
 * The startup's ask: the catalogue's first answer takes a quarter of a
 * minute, so the one who starts the server is the one who waits for it —
 * no person's page does.
 */
export function warmRegistryCatalogue(): void {
  void (async () => {
    const url = await getRegistryFetchUrl();
    if (url) await startRefresh(url);
  })();
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
