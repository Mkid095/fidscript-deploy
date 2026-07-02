import { FidscriptClient } from '../client';

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
  score: number; // 0–100 weighted score
  breakdown: {
    dns: number;     // 0 or 30
    routing: number; // 0 or 20
    ssl: number;     // 0 or 30
    email: number;   // 0 or 20
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

export class DomainsModule {
  constructor(private client: FidscriptClient) {}

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
   * @param projectId  Project to add the domain to
   * @param name       Full domain name (e.g. "example.com")
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

  /**
   * Get DNS instructions (nameserver records to set) for a domain — used in manual DNS mode.
   */
  async getInstructions(projectId: string, domainId: string): Promise<{ instructions: Array<{ type: string; name: string; value: string; ttl?: number; notes?: string }> }> {
    return this.client.get(`/api/v1/projects/${projectId}/domains/${domainId}/instructions`);
  }

  /**
   * Detect the DNS provider for a domain by querying its authoritative nameservers.
   * Use this before adding a domain to determine whether Cloudflare Auto-DNS is available.
   */
  async detectDnsProvider(projectId: string, domain: string): Promise<{
    provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'unknown';
    nameservers: string[];
    autoConfigurationAvailable: boolean;
    suggestedMode: 'cloudflare_auto' | 'manual';
  }> {
    return this.client.get(`/api/v1/projects/${projectId}/domains/detect`, { params: { domain } });
  }

  /**
   * Connect a Cloudflare account to a project for Mode B (auto) DNS management.
   * Stores the token encrypted server-side.
   */
  async connectCloudflare(projectId: string, apiToken: string): Promise<DnsConnection> {
    return this.client.post<DnsConnection>(
      `/api/v1/projects/${projectId}/domains/connect-cloudflare`,
      { apiToken },
    );
  }

  /**
   * Get the Cloudflare OAuth authorization URL and state.
   * Redirect the user to the returned URL to authorize.
   */
  async getCloudflareOAuthUrl(projectId: string): Promise<{ url: string; state: string; projectId: string }> {
    return this.client.get(`/api/v1/projects/${projectId}/domains/connect-cloudflare/oauth`);
  }

  /**
   * Complete the Cloudflare OAuth flow by exchanging the authorization code for a token.
   */
  async completeCloudflareOAuth(code: string, state: string, projectId: string): Promise<{
    success: boolean;
    connection: DnsConnection;
    message: string;
  }> {
    return this.client.post(`/api/v1/domains/connect-cloudflare/callback`, { code, state, projectId });
  }

  /**
   * List Cloudflare zones accessible with the connected OAuth token.
   */
  async listCloudflareZones(projectId: string): Promise<{ zones: Array<{ id: string; name: string; status: string }> }> {
    return this.client.get(`/api/v1/projects/${projectId}/domains/connect-cloudflare/zones`);
  }

  /**
   * Get the active DNS connection for a project (Cloudflare, Route53, etc.)
   */
  async getConnection(projectId: string): Promise<DnsConnection | null> {
    try {
      return await this.client.get<DnsConnection>(
        `/api/v1/projects/${projectId}/domains/connection`,
      );
    } catch {
      return null;
    }
  }

  /**
   * Get the latest health check result for a domain (DNS, routing, SSL).
   * Returns null if no health check has been run yet.
   */
  async getHealth(projectId: string, domainId: string): Promise<DomainHealth | null> {
    return this.client.get<DomainHealth | null>(
      `/api/v1/projects/${projectId}/domains/${domainId}/health`,
    );
  }

  /**
   * Trigger a new health check for a domain. Runs asynchronously —
   * call getHealth() again after a few seconds to get the result.
   */
  async triggerHealthCheck(projectId: string, domainId: string): Promise<{ status: string; message: string }> {
    return this.client.post(
      `/api/v1/projects/${projectId}/domains/${domainId}/health`,
    );
  }

  /**
   * Get all required DNS records for a domain (deployment + email verification).
   * Includes A/CNAME (deployment), MX/SPF/DKIM/DMARC (email), and TXT (ownership).
   */
  async getDnsRecords(projectId: string, domainId: string): Promise<DnsRecordsResponse> {
    return this.client.get<DnsRecordsResponse>(
      `/api/v1/projects/${projectId}/domains/${domainId}/dns-records`,
    );
  }

  /**
   * Auto-configure DNS records via Cloudflare API (Mode B).
   * Requires the domain to be in cloudflare_auto mode with an active connection.
   */
  async autoConfigureDnsRecords(projectId: string, domainId: string): Promise<{ success: boolean }> {
    return this.client.post(
      `/api/v1/projects/${projectId}/domains/${domainId}/dns-records/auto-configure`,
    );
  }

  /**
   * Get SSL certificate info for a domain (status, expiry, method, auto-renew).
   */
  async getSsl(projectId: string, domainId: string): Promise<DomainSslInfo> {
    return this.client.get<DomainSslInfo>(
      `/api/v1/projects/${projectId}/domains/${domainId}/ssl`,
    );
  }

  /**
   * Renew the SSL certificate for a domain. Runs asynchronously —
   * poll getSsl() until status returns to ACTIVE.
   */
  async renewSsl(projectId: string, domainId: string): Promise<{ status: string; message: string }> {
    return this.client.post(
      `/api/v1/projects/${projectId}/domains/${domainId}/ssl/renew`,
    );
  }

  /**
   * Reissue the SSL certificate for a domain (force new cert even if current is valid).
   */
  async reissueSsl(projectId: string, domainId: string): Promise<{ status: string; message: string }> {
    return this.client.post(
      `/api/v1/projects/${projectId}/domains/${domainId}/ssl/reissue`,
    );
  }

  /**
   * Get the verification run history (audit trail) for a domain.
   */
  async getHistory(projectId: string, domainId: string): Promise<DomainVerificationRun[]> {
    return this.client.get<DomainVerificationRun[]>(
      `/api/v1/projects/${projectId}/domains/${domainId}/history`,
    );
  }

  /**
   * Get all incidents (open and resolved) for a domain.
   */
  async getIncidents(projectId: string, domainId: string): Promise<DomainIncident[]> {
    return this.client.get<DomainIncident[]>(
      `/api/v1/projects/${projectId}/domains/${domainId}/incidents`,
    );
  }

  /**
   * Get the health score timeline for a domain — for charts and analytics.
   * @param days Number of days of history to return (default 30)
   */
  async getHealthTimeline(projectId: string, domainId: string, days = 30): Promise<DomainHealthTimelineEntry[]> {
    return this.client.get<DomainHealthTimelineEntry[]>(
      `/api/v1/projects/${projectId}/domains/${domainId}/health-timeline`,
    );
  }

  /**
   * Get DNS Wizard status for a domain — required records, live propagation status, and progress per category.
   */
  async getWizard(projectId: string, domainId: string): Promise<DomainWizardStatus> {
    return this.client.get<DomainWizardStatus>(
      `/api/v1/projects/${projectId}/domains/wizard/${domainId}`,
    );
  }
}
