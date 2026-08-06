/**
 * Hosts interface (canonical `DomainsHost`) — assembled from the part-2 and
 * part-3 declarations via TypeScript interface merging. This file holds the
 * client field plus DNS basics; the rest live in:
 *   - ./domains-host-part2.ts  (DNS ops + change sets + Cloudflare)
 *   - ./domains-host-part3.ts  (templates + webhooks)
 */

import type { FidscriptClient } from '../client';
import type {
  DnsRecordsResponse,
  DomainHealth,
  DomainSslInfo,
  DnsConnection,
  DomainVerificationRun,
  DomainIncident,
} from './domains-types';
import type {
  DomainHealthTimelineEntry,
  DomainWizardStatus,
} from './domains-types-wizard';
import type { DomainsHostPart2 } from './domains-host-part2';
import type { DomainsHostPart3 } from './domains-host-part3';

export interface DomainsHost extends DomainsHostPart2, DomainsHostPart3 {
  readonly client: FidscriptClient;

  // DNS basics
  getInstructions(projectId: string, domainId: string): Promise<{ instructions: Array<{ type: string; name: string; value: string; ttl?: number; notes?: string }> }>;
  detectDnsProvider(projectId: string, domain: string): Promise<{
    provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
    nameservers: string[];
    autoConfigurationAvailable: boolean;
    suggestedMode: 'cloudflare_auto' | 'manual';
  }>;
  getConnection(projectId: string): Promise<DnsConnection | null>;
  getHealth(projectId: string, domainId: string): Promise<DomainHealth | null>;
  triggerHealthCheck(projectId: string, domainId: string): Promise<{ status: string; message: string }>;
  getDnsRecords(projectId: string, domainId: string): Promise<DnsRecordsResponse>;
  getSsl(projectId: string, domainId: string): Promise<DomainSslInfo>;
  renewSsl(projectId: string, domainId: string): Promise<{ status: string; message: string }>;
  reissueSsl(projectId: string, domainId: string): Promise<{ status: string; message: string }>;
  getHistory(projectId: string, domainId: string): Promise<DomainVerificationRun[]>;
  getIncidents(projectId: string, domainId: string): Promise<DomainIncident[]>;
  getHealthTimeline(projectId: string, domainId: string, days?: number): Promise<DomainHealthTimelineEntry[]>;
  getWizard(projectId: string, domainId: string): Promise<DomainWizardStatus>;
}