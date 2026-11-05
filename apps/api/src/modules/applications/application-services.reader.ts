import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DOCKER_DIR } from './application-manifest.reader';

/**
 * The installer's service list, read to find the hostnames an application
 * publishes.
 *
 * `installer/config/services.tsv` is the one place the hostnames are
 * written down: the wizard creates the DNS records from it, and the Traefik
 * routes are written to match. An application installed from the dashboard
 * needs its records too — otherwise its console is a hostname that does not
 * resolve.
 */
export interface ServiceEntry {
  label: string;
  /** The hostname relative to the platform domain. */
  host: string;
  record: string;
  target: string;
  /** "always", or the add-on that publishes this service. */
  when: string;
}

/** The services an add-on publishes. */
export function readAddonServices(addonId: string): ServiceEntry[] {
  return readServices().filter((service) => service.when === addonId);
}

/** Every service in the list. */
export function readServices(): ServiceEntry[] {
  const file = join(DOCKER_DIR, '..', 'config', 'services.tsv');
  if (!existsSync(file)) return [];
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }

  const services: ServiceEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length < 5) continue;
    const [label, host, record, target, when] = cols;
    services.push({ label, host, record, target, when });
  }
  return services;
}
