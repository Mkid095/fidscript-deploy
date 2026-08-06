/**
 * Domains module — core CRUD + composes domain-specific method groups.
 *
 * Sub-modules (each ≤150 lines):
 * - domains-dns.ts                 — DNS basics (records, health, SSL)
 * - domains-dns-ops.ts             — DNS operations (auto-configure, sync, plan)
 * - domains-change-sets.ts         — change sets + propagation tracking
 * - domains-cloudflare.ts          — Cloudflare OAuth + zone methods
 * - domains-templates-webhooks.ts  — templates + webhooks
 * - domains-types.ts               — entity types (Domain, DnsConnection, …)
 * - domains-types-wizard.ts        — wizard + timeline types
 * - domains-host.ts                — DomainsHost interface (mixin target)
 *
 * Method groups are attached via `apply*Methods` helpers in the constructor.
 * The host interface (`DomainsHost`, in `./domains-host.ts`) declares every
 * method so consumers see a stable, fully-typed surface. This pattern keeps
 * every file under the 150-line ANPAS limit while preserving the original
 * public API.
 */

import { FidscriptClient } from '../client';
import type { Domain, DomainType } from './domains-types';
import type { DomainsHost } from './domains-host';

import { applyDnsMethods } from './domains-dns';
import { applyDnsOpsMethods } from './domains-dns-ops';
import { applyChangeSetMethods } from './domains-change-sets';
import { applyCloudflareMethods } from './domains-cloudflare';
import { applyDomainsAuxMethods } from './domains-templates-webhooks';

export type { DomainsHost };

export type {
  Domain,
  DnsConnection,
  DomainHealth,
  DomainHealthStatus,
  DnsRecord,
  DnsRecordCategory,
  DnsRecordStatus,
  DnsRecordsResponse,
  DomainSslInfo,
  DomainType,
  DomainCapabilities,
  DomainReconciliationStatus,
  DomainVerificationRun,
  DomainIncident,
} from './domains-types';
export type {
  DomainHealthTimelineEntry,
  DomainWizardStatus,
  WizardStage,
  WizardRecord,
  WizardRecordStatus,
} from './domains-types-wizard';

export class DomainsModule {
  readonly client: FidscriptClient;

  constructor(client: FidscriptClient) {
    this.client = client;
    applyDnsMethods(this as unknown as DomainsHost);
    applyDnsOpsMethods(this as unknown as DomainsHost);
    applyChangeSetMethods(this as unknown as DomainsHost);
    applyCloudflareMethods(this as unknown as DomainsHost);
    applyDomainsAuxMethods(this as unknown as DomainsHost);
  }

  /** List domains for a specific project */
  async list(projectId: string): Promise<Domain[]> {
    const res = await this.client.get<{ domains: Domain[] }>(
      `/api/v1/projects/${projectId}/domains`,
    );
    return res.domains ?? [];
  }

  async get(id: string): Promise<Domain> {
    return this.client.get<Domain>(`/api/v1/domains/${id}`);
  }

  /**
   * Add a domain to a project.
   * @param dnsMode    "manual" | "cloudflare_auto" — defaults to "manual"
   * @param deploymentId Optional deployment to route this domain to
   * @param type       Domain purpose(s): DEPLOYMENT | EMAIL | INBOUND_EMAIL | TRACKING | API | REDIRECT | SANDBOX
   */
  async create(
    projectId: string,
    name: string,
    dnsMode = 'manual',
    deploymentId?: string,
    type?: DomainType[],
  ) {
    const payload: Record<string, unknown> = { projectId, name, dnsMode };
    if (deploymentId) payload.deploymentId = deploymentId;
    if (type?.length) payload.type = type;
    return this.client.post<Domain>(`/api/v1/projects/${projectId}/domains`, payload);
  }

  async verify(id: string): Promise<Domain> {
    return this.client.post<Domain>(`/api/v1/domains/${id}/verify`);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete(`/api/v1/domains/${id}`);
  }
}