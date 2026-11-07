/**
 * Domain type definitions — split out of domains.ts for ANPAS 150-line limit.
 */

export type DomainType = 'DEPLOYMENT' | 'EMAIL' | 'INBOUND_EMAIL' | 'TRACKING' | 'API' | 'REDIRECT' | 'SANDBOX';

export interface DomainCapabilities {
  deployment: boolean;
  email: boolean;
  inboundEmail: boolean;
  tracking: boolean;
  api: boolean;
  redirect: boolean;
  sandbox: boolean;
}

export interface Domain {
  id: string;
  projectId: string;
  deploymentId?: string;
  domain: string;
  isCustom: boolean;
  isPrimary: boolean;
  apexDomain: boolean;
  type: DomainType[];
  capabilities: DomainCapabilities;
  dnsMode: string;
  redirectMode: string;
  sslEnabled: boolean;
  sslStatus: string;
  dnsStatus: string;
  dnsVerifiedAt?: string;
  routingVerifiedAt?: string;
  sslExpiresAt?: string;
  healthStatus?: DomainReconciliationStatus;
  lastVerifiedAt?: string;
  nextVerificationAt?: string;
  verificationFailures?: number;
  lastHealthScore?: number;
  priority?: number;
  createdAt: string;
}

export interface DnsConnection {
  id: string;
  projectId: string;
  provider: string;
  email?: string;
  lastVerifiedAt?: string;
  createdAt: string;
}

export type DomainHealthStatus = 'ok' | 'degraded' | 'broken' | null;

export interface DomainHealth {
  dnsOk: boolean;
  routingOk: boolean;
  sslOk: boolean;
  emailOk: boolean;
  responseTimeMs: number | null;
  sslExpiresInDays: number | null;
  status: DomainHealthStatus;
  errorMessage: string | null;
  checkedAt: string;
  score: number;
  breakdown: {
    dns: number;
    routing: number;
    ssl: number;
    email: number;
  };
}

export interface DomainSslInfo {
  enabled: boolean;
  status: string;
  method: string;
  issuedAt: string | null;
  expiresAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  autoRenew: boolean;
}

export type DnsRecordCategory = 'deployment' | 'email' | 'verification';
export type DnsRecordStatus = 'ok' | 'missing' | 'pending';

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  ttl?: number;
  status: DnsRecordStatus;
  category: DnsRecordCategory;
}

export interface DnsRecordsResponse {
  domainId: string;
  domain: string;
  records: DnsRecord[];
}

/** Reconciliation engine health state — matches DomainHealthStatus enum */
export type DomainReconciliationStatus = 'PENDING' | 'HEALTHY' | 'DEGRADED' | 'FAILED';

/** A single verification run in the audit trail */
export interface DomainVerificationRun {
  id: string;
  domainId: string;
  reason: 'scheduled' | 'manual' | 'dns_change' | 'ssl_expiry' | 'domain_created' | 'cloudflare_configured' | 'recovery';
  previousStatus: DomainReconciliationStatus | null;
  newStatus: DomainReconciliationStatus | null;
  previousScore: number | null;
  newScore: number | null;
  durationMs: number | null;
  checks: {
    dnsOk: boolean;
    sslOk: boolean;
    emailOk: boolean;
    routingOk: boolean;
    responseTimeMs: number;
  } | null;
  error: string | null;
  createdAt: string;
}

/** A domain incident — opened on failure, resolved on recovery */
export interface DomainIncident {
  id: string;
  domainId: string;
  type: 'ssl_expired' | 'dns_missing' | 'mx_invalid' | 'routing_failure' | 'certificate_issuance_failed';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string | null;
  status: 'open' | 'resolved';
  openedAt: string;
  resolvedAt: string | null;
}