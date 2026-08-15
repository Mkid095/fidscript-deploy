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

export class DomainsModule implements DomainsHost {
  readonly client: FidscriptClient;

  // DNS basics (applyDnsMethods)
  getInstructions!: (projectId: string, domainId: string) => Promise<{ instructions: Array<{ type: string; name: string; value: string; ttl?: number; notes?: string }> }>;
  detectDnsProvider!: (projectId: string, domain: string) => Promise<{ provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown'; nameservers: string[]; autoConfigurationAvailable: boolean; suggestedMode: 'cloudflare_auto' | 'manual' }>;
  getConnection!: (projectId: string) => Promise<import('./domains-types').DnsConnection | null>;
  getHealth!: (projectId: string, domainId: string) => Promise<import('./domains-types').DomainHealth | null>;
  triggerHealthCheck!: (projectId: string, domainId: string) => Promise<{ status: string; message: string }>;
  getDnsRecords!: (projectId: string, domainId: string) => Promise<import('./domains-types').DnsRecordsResponse>;
  getSsl!: (projectId: string, domainId: string) => Promise<import('./domains-types').DomainSslInfo>;
  renewSsl!: (projectId: string, domainId: string) => Promise<{ status: string; message: string }>;
  reissueSsl!: (projectId: string, domainId: string) => Promise<{ status: string; message: string }>;
  getHistory!: (projectId: string, domainId: string) => Promise<import('./domains-types').DomainVerificationRun[]>;
  getIncidents!: (projectId: string, domainId: string) => Promise<import('./domains-types').DomainIncident[]>;
  getHealthTimeline!: (projectId: string, domainId: string, days?: number) => Promise<import('./domains-types-wizard').DomainHealthTimelineEntry[]>;
  getWizard!: (projectId: string, domainId: string) => Promise<import('./domains-types-wizard').DomainWizardStatus>;

  // DNS ops (applyDnsOpsMethods)
  autoConfigureDnsRecords!: (projectId: string, domainId: string) => Promise<{ success: boolean }>;
  autoConfigureEmailRecords!: (projectId: string, domainId: string) => Promise<{ mx: number; spf: boolean; dkim: boolean; dmarc: boolean; records: Array<{ type: string; name: string; content: string }> }>;
  getEmailRecordsStatus!: (projectId: string, domainId: string) => Promise<{ mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean; details: Array<{ type: string; name: string; status: 'ok' | 'missing' }> }>;
  rotateDkim!: (projectId: string, domainId: string) => Promise<{ selector: string; publicKey: string; dnsName: string; dnsContent: string }>;
  importZone!: (projectId: string, domainId: string) => Promise<{ domain: string; zoneImported: number; warnings: string[]; records: Array<{ id: string; type: string; name: string; content: string; ttl?: number }> }>;
  syncZone!: (projectId: string, domainId: string) => Promise<{ created: number; updated: number; deleted: number; warnings: string[] }>;
  exportZone!: (projectId: string, domainId: string) => Promise<{ domain: string; zoneId: string; zoneName: string; provider: string; exportedAt: string; recordCount: number; records: Array<{ id: string; type: string; name: string; content: string; ttl?: number }> }>;
  getDnsPlan!: (projectId: string, domainId: string) => Promise<{ create: Array<{ type: string; name: string; content: string }>; update: Array<{ type: string; name: string; content: string }>; delete: Array<{ type: string; name: string; content: string }>; warnings: string[] }>;

  // Change sets (applyChangeSetMethods)
  listChangeSets!: (projectId: string, domainId: string, options?: { limit?: number }) => Promise<{ changeSets: Array<{ id: string; status: 'pending' | 'applied' | 'failed' | 'rolled_back'; operations: Array<Record<string, unknown>>; appliedAt?: string; result?: { created: number; updated: number; deleted: number; errors: string[] } }>; total: number }>;
  getManagedRecords!: (projectId: string, domainId: string) => Promise<{ records: Array<{ id: string; type: string; name: string; value: string; ttl: number; priority?: number; managedBy: 'platform' | 'user' | 'imported'; source: string; lastSyncedAt?: string }> }>;
  importManagedRecords!: (projectId: string, domainId: string) => Promise<{ imported: number; total: number }>;
  createChangeSet!: (projectId: string, domainId: string, operations: Array<{ action: 'create' | 'update' | 'delete'; recordId?: string; type?: string; name?: string; value?: string; ttl?: number; priority?: number; source?: string }>) => Promise<{ id: string; status: 'pending' }>;
  applyChangeSet!: (projectId: string, changeSetId: string) => Promise<{ id: string; status: 'applied' | 'failed'; result: { created: number; updated: number; deleted: number; errors: string[] } }>;
  rollbackChangeSet!: (projectId: string, changeSetId: string) => Promise<{ id: string; status: 'rolled_back'; result: { created: number; updated: number; deleted: number; errors: string[] } }>;
  checkPropagation!: (projectId: string, domainId: string, options?: { type?: string; name?: string; expected?: string }) => Promise<{ domain: string; records?: Array<{ domain: string; recordType: string; expectedValue: string; checks: Array<{ resolver: string; location: string; server: string; status: 'propagated' | 'pending' | 'failed'; value: string | null; responseTimeMs: number }>; propagated: number; total: number; percentage: number; fullyPropagated: boolean }>; overallPercentage?: number }>;

  // Cloudflare (applyCloudflareMethods)
  connectCloudflare!: (projectId: string, apiToken: string) => Promise<import('./domains-types').DnsConnection>;
  getCloudflareOAuthUrl!: (projectId: string) => Promise<{ url: string; state: string; projectId: string }>;
  completeCloudflareOAuth!: (code: string, state: string, projectId: string) => Promise<{ success: boolean; connection: import('./domains-types').DnsConnection; message: string }>;
  listCloudflareZones!: (projectId: string) => Promise<{ zones: Array<{ id: string; name: string; status: string }> }>;
  testCloudflareConnection!: (clientId: string, clientSecret: string) => Promise<{ valid: boolean }>;
  getCloudflareOAuthStatus!: () => Promise<{ enabled: boolean }>;

  // Templates + webhooks (applyDomainsAuxMethods)
  listTemplates!: (options?: { category?: string; popularOnly?: boolean }) => Promise<{ templates: Array<{ id: string; name: string; description: string; icon: string; category: string; capabilities: Record<string, boolean>; types: string[]; records: Array<{ type: string; name: string; valueTemplate: string; ttl: number; priority?: number }>; sslEnabled: boolean; wildcardEnabled: boolean; popular: boolean }> }>;
  getTemplate!: (id: string) => Promise<{ id: string; name: string; description: string; icon: string; category: string; capabilities: Record<string, boolean>; types: string[]; records: Array<{ type: string; name: string; valueTemplate: string; ttl: number; priority?: number }>; sslEnabled: boolean; wildcardEnabled: boolean }>;
  listWebhooks!: (projectId: string, domainId: string) => Promise<{ webhooks: Array<{ id: string; url: string; events: string[]; enabled: boolean; lastDeliveryAt: string | null; lastDeliveryOk: boolean | null; deliveryCount: number; failureCount: number }> }>;
  createWebhook!: (projectId: string, domainId: string, options: { url: string; secret?: string; events?: string[]; enabled?: boolean }) => Promise<{ id: string; url: string; enabled: boolean }>;
  updateWebhook!: (projectId: string, domainId: string, webhookId: string, updates: { url?: string; events?: string[]; enabled?: boolean; secret?: string }) => Promise<{ success: boolean }>;
  deleteWebhook!: (projectId: string, domainId: string, webhookId: string) => Promise<{ success: boolean }>;
  testWebhook!: (projectId: string, domainId: string, webhookId: string) => Promise<{ success: boolean; error?: string; deliveredAt: string }>;

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
    const payload: Record<string, unknown> = { projectId, domain: name, dnsMode };
    if (deploymentId) payload.deploymentId = deploymentId;
    if (type?.length) payload.type = type;
    return this.client.post<Domain>(`/api/v1/projects/${projectId}/domains`, payload);
  }

  async verify(projectId: string, id: string): Promise<Domain> {
    return this.client.post<Domain>(`/api/v1/projects/${projectId}/domains/${id}/verify`);
  }

  async delete(projectId: string, id: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/domains/${id}`);
  }
}