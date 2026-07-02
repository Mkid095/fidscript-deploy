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
   */
  async create(projectId: string, name: string, dnsMode = 'manual', deploymentId?: string) {
    const payload: Record<string, unknown> = { projectId, name, dnsMode };
    if (deploymentId) payload.deploymentId = deploymentId;
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
}
