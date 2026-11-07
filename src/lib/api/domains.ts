import 'server-only';

import { serverApi as api } from './server';

/**
 * The project's domains, and the DNS behind them.
 *
 * A domain can be pointed at the platform by hand — the records are shown
 * and copied — or by connecting the account that holds it and letting the
 * platform write them. Both are real; the console shows which one is in
 * use.
 */

export interface DnsConnection {
  id: string;
  projectId: string;
  provider: string;
  email: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
  status?: 'ok' | 'missing' | 'pending';
  category?: 'deployment' | 'email' | 'verification';
  notes?: string;
}

/** The account the platform writes DNS through, if there is one. */
export async function getDnsConnection(projectId: string): Promise<DnsConnection | null> {
  return api.get<DnsConnection | null>(`/projects/${projectId}/domains/connection`).catch(() => null);
}

/** The account is let go — the token goes with it. */
export async function disconnectDnsProvider(projectId: string): Promise<boolean> {
  const response = await api
    .delete<{ disconnected: boolean }>(`/projects/${projectId}/domains/connection`)
    .catch(() => ({ disconnected: false }));
  return response.disconnected;
}

/** The records a domain needs. Their status is live. */
export async function getDnsRecords(
  projectId: string,
  domainId: string,
): Promise<{ domain: string; records: DnsRecord[] } | null> {
  return api
    .get<{ domain: string; records: DnsRecord[] }>(
      `/projects/${projectId}/domains/${domainId}/dns-records`,
    )
    .catch(() => null);
}

/** Who serves the domain's DNS — so the console can say what to expect. */
export async function detectDnsProvider(
  projectId: string,
  domain: string,
): Promise<{ provider?: string; nameservers?: string[] } | null> {
  return api
    .get<{ provider?: string; nameservers?: string[] }>(
      `/projects/${projectId}/domains/detect`,
      { domain },
    )
    .catch(() => null);
}
