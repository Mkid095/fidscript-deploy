/**
 * DomainsHost part 2 — DNS ops + change sets + propagation + Cloudflare.
 * The host interface is split into multiple declaration files because the
 * combined signature exceeds 150 lines (ANPAS limit).
 *
 * Merged into the canonical `DomainsHost` via TypeScript declaration merging.
 */

import type { DnsConnection } from './domains-types';

export interface DomainsHostPart2 {
  // DNS ops
  autoConfigureDnsRecords(projectId: string, domainId: string): Promise<{ success: boolean }>;
  autoConfigureEmailRecords(projectId: string, domainId: string): Promise<{
    mx: number; spf: boolean; dkim: boolean; dmarc: boolean;
    records: Array<{ type: string; name: string; content: string }>;
  }>;
  getEmailRecordsStatus(projectId: string, domainId: string): Promise<{
    mx: boolean; spf: boolean; dkim: boolean; dmarc: boolean;
    details: Array<{ type: string; name: string; status: 'ok' | 'missing' }>;
  }>;
  rotateDkim(projectId: string, domainId: string): Promise<{
    selector: string; publicKey: string; dnsName: string; dnsContent: string;
  }>;
  importZone(projectId: string, domainId: string): Promise<{
    domain: string; zoneImported: number; warnings: string[];
    records: Array<{ id: string; type: string; name: string; content: string; ttl?: number }>;
  }>;
  syncZone(projectId: string, domainId: string): Promise<{
    created: number; updated: number; deleted: number; warnings: string[];
  }>;
  exportZone(projectId: string, domainId: string): Promise<{
    domain: string; zoneId: string; zoneName: string; provider: string;
    exportedAt: string; recordCount: number;
    records: Array<{ id: string; type: string; name: string; content: string; ttl?: number }>;
  }>;
  getDnsPlan(projectId: string, domainId: string): Promise<{
    create: Array<{ type: string; name: string; content: string }>;
    update: Array<{ type: string; name: string; content: string }>;
    delete: Array<{ type: string; name: string; content: string }>;
    warnings: string[];
  }>;

  // Change sets + propagation
  listChangeSets(projectId: string, domainId: string, options?: { limit?: number }): Promise<{
    changeSets: Array<{
      id: string;
      status: 'pending' | 'applied' | 'failed' | 'rolled_back';
      operations: Array<Record<string, unknown>>;
      appliedAt?: string;
      result?: { created: number; updated: number; deleted: number; errors: string[] };
    }>;
    total: number;
  }>;
  getManagedRecords(projectId: string, domainId: string): Promise<{
    records: Array<{
      id: string; type: string; name: string; value: string; ttl: number;
      priority?: number;
      managedBy: 'platform' | 'user' | 'imported';
      source: string; lastSyncedAt?: string;
    }>;
  }>;
  importManagedRecords(projectId: string, domainId: string): Promise<{ imported: number; total: number }>;
  createChangeSet(projectId: string, domainId: string, operations: Array<{
    action: 'create' | 'update' | 'delete';
    recordId?: string; type?: string; name?: string; value?: string;
    ttl?: number; priority?: number; source?: string;
  }>): Promise<{ id: string; status: 'pending' }>;
  applyChangeSet(projectId: string, changeSetId: string): Promise<{
    id: string; status: 'applied' | 'failed';
    result: { created: number; updated: number; deleted: number; errors: string[] };
  }>;
  rollbackChangeSet(projectId: string, changeSetId: string): Promise<{
    id: string; status: 'rolled_back';
    result: { created: number; updated: number; deleted: number; errors: string[] };
  }>;
  checkPropagation(projectId: string, domainId: string, options?: {
    type?: string; name?: string; expected?: string;
  }): Promise<{
    domain: string;
    records?: Array<{
      domain: string; recordType: string; expectedValue: string;
      checks: Array<{
        resolver: string; location: string; server: string;
        status: 'propagated' | 'pending' | 'failed';
        value: string | null; responseTimeMs: number;
      }>;
      propagated: number; total: number; percentage: number; fullyPropagated: boolean;
    }>;
    overallPercentage?: number;
  }>;

  // Cloudflare
  connectCloudflare(projectId: string, apiToken: string): Promise<DnsConnection>;
  getCloudflareOAuthUrl(projectId: string): Promise<{ url: string; state: string; projectId: string }>;
  completeCloudflareOAuth(code: string, state: string, projectId: string): Promise<{
    success: boolean; connection: DnsConnection; message: string;
  }>;
  listCloudflareZones(projectId: string): Promise<{ zones: Array<{ id: string; name: string; status: string }> }>;
  testCloudflareConnection(clientId: string, clientSecret: string): Promise<{ valid: boolean }>;
  getCloudflareOAuthStatus(): Promise<{ enabled: boolean }>;
}