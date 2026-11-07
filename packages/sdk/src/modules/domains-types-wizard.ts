/**
 * Domain wizard + timeline type definitions.
 * Split out of domains-types.ts to keep each file under 150 lines.
 */

/** A single point on the health score timeline */
export interface DomainHealthTimelineEntry {
  checkedAt: string;
  score: number;
  status: 'ok' | 'degraded' | 'broken';
  breakdown: {
    dns: number;
    routing: number;
    ssl: number;
    email: number;
  } | null;
}

export type WizardStage = 'domain_entered' | 'purpose_selected' | 'provider_selected' | 'records_configured' | 'verifying' | 'active';

export type WizardRecordStatus = 'ok' | 'missing' | 'pending' | 'unknown';

export interface WizardRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl: number;
  category: 'deployment' | 'email' | 'verification';
  status: WizardRecordStatus;
}

export interface DomainWizardStatus {
  domainId: string;
  domain: string;
  stage: WizardStage;
  types: string[];
  provider: string | null;
  detectedProvider: string | null;
  records: WizardRecord[];
  dnsProgress: number;
  sslProgress: number;
  routingProgress: number;
  emailProgress: number;
  overallProgress: number;
  sslExpiresInDays: number | null;
  estimatedTimeRemaining: string | null;
}