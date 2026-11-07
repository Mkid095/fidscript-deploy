/**
 * The names the platform answers on, and the ones a project may not take.
 *
 * The platform publishes itself on names of a shape: the console at
 * `app.<domain>`, the API at `api.<domain>`, the dashboards at
 * `grafana.<domain>`, and the applications it hosts on names of the same
 * kind. A project's domain is a name that points at this platform — so a
 * project that took one of the platform's own names would take the
 * platform's door off its hinges.
 *
 * The check is here, on its own, because two places need it: adding a
 * domain, and writing the records for one that is already there.
 */

/** The subdomains the platform and its applications answer on. */
const RESERVED_LABELS = new Set([
  'app', 'api', 'grafana', 'prometheus', 'loki', 'maven', 'registry',
  'files', 'storage', 'whatsapp', 'whatsappapi', 'realtime', 'instant',
  'apiinstant', 'cliinstant', 'instantmcp', 'mail', 'smtp', 'imap',
  'minio', 'stalwart-admin', 'dashboard',
]);

/**
 * Why the domain cannot be used — or null when it can.
 *
 * The sentence is written for the person who typed the name: it says what
 * the name is, and what to do instead.
 */
export function reservedHostReason(domain: string, platformDomain: string): string | null {
  const name = domain.toLowerCase().replace(/\.$/, '');
  const platform = platformDomain.toLowerCase();

  if (name === platform) {
    return (
      `"${domain}" is the platform's own domain. A project needs a name of its own — ` +
      'a domain you hold, or a subdomain of one.'
    );
  }

  if (name.endsWith(`.${platform}`)) {
    const label = name.slice(0, -(platform.length + 1)).split('.').pop() as string;
    if (RESERVED_LABELS.has(label)) {
      return (
        `"${domain}" is where the platform's own ${label} answers — a project cannot take it. ` +
        `Use another name (for example "${label}-<your project>.${platform}"), or a domain of your own.`
      );
    }
  }

  return null;
}
