// linkSubdomainDomain — register the {subdomain}.apps.{platformDomain}
// hostname as a Domain record pointing at the new deployment.
//
// The platform already wires Traefik to serve traffic on the wildcard
// *.apps.{platformDomain} zone, but the Domains tab, the operator console,
// and the DNS health checks all key off the Domain row in Prisma. Without
// this call a freshly-deployed subdomain shows up nowhere in the dashboard.
//
// Manual DNS mode is correct here: the wildcard A record at the platform
// zone is platform-managed and not something the user can change from
// the dashboard. We only need the binding, not a Cloudflare auto-config.

import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export type LinkSubdomainDomainResult =
  | { ok: true; domainId: string }
  | { ok: false; error: string };

const DEFAULT_PLATFORM_DOMAIN = 'deploy.fidscript.com';

export async function linkSubdomainDomain({
  sdk,
  projectId,
  subdomain,
  deploymentId,
}: {
  sdk: FidscriptSDK;
  projectId: string;
  subdomain: string;
  deploymentId: string;
}): Promise<LinkSubdomainDomainResult> {
  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? DEFAULT_PLATFORM_DOMAIN;
  const fqdn = `${subdomain}.apps.${platformDomain}`;
  try {
    const created = await sdk.domains.create(projectId, fqdn, 'manual', deploymentId, ['DEPLOYMENT']);
    const domainId = (created as { id?: string })?.id;
    if (!domainId) {
      return { ok: false, error: 'Domain create response missing id' };
    }
    return { ok: true, domainId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'unknown error',
    };
  }
}