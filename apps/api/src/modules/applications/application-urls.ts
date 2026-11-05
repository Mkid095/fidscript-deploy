import type { ApplicationPresentation } from './applications.catalog';

/**
 * Where an application's console, API and MCP server live.
 *
 * They are resolved against the platform's own domain, so the catalogue is
 * correct on any install — the same way the Traefik routes are.
 */

/** The console a human opens. Null when the application has none. */
export function resolveUrl(
  presentation: ApplicationPresentation,
  domain: string,
  ip: string,
): string | null {
  if (presentation.port) {
    const host = ip || domain;
    return host ? `http://${host}:${presentation.port}` : null;
  }
  if (!domain) return null;
  if (presentation.host) {
    return `https://${presentation.host}.${domain}${presentation.path ?? ''}`;
  }
  if (presentation.path) {
    // A console on the platform's own domain — the dashboard itself.
    return `https://${domain}${presentation.path}`;
  }
  return null;
}

/** The application's own API host, when it speaks one over HTTP. */
export function resolveApiHost(
  presentation: ApplicationPresentation,
  domain: string,
): string | null {
  if (!presentation.apiHost) return null;
  return domain ? `https://${presentation.apiHost}.${domain}` : null;
}

/**
 * The application's MCP server, with its hosts resolved.
 *
 * The variable names are the ones the server itself reads — `INSTANT_API_HOST`
 * and its siblings — so the block an operator copies works as it is.
 */
export function resolveMcp(
  presentation: ApplicationPresentation,
  domain: string,
): { package: string; env: Record<string, string> } | null {
  if (!presentation.mcp) return null;
  if (!domain) return null;

  const env: Record<string, string> = {};
  for (const [variable, label] of Object.entries(presentation.mcp.hosts)) {
    env[variable] = `https://${label}.${domain}`;
  }
  return { package: presentation.mcp.package, env };
}

/** The name of a core application. */
export function coreTitle(id: string): string {
  return id === 'deployment' ? 'Deployments' : 'Email';
}

/** What a core application does, in one line. */
export function coreSummary(id: string): string {
  return id === 'deployment'
    ? 'Build and run your applications on this server — a git push is the whole deploy.'
    : 'Send and receive mail on your own domain, with deliverability, aliases and inbound.';
}
