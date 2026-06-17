/**
 * DnsProvider interface — pluggable DNS provider for domain verification.
 *
 * Caller (DomainsService) depends on this interface, never Cloudflare directly.
 * Development Rule 5: Never hardcode external services.
 */
export interface DnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
}

export interface DnsProvider {
  name: string;

  /**
   * Create a DNS record in the provider's zone.
   * For platform subdomains on our zone (deploy.fidscript.com):
   *   - CNAME to the server IP or target
   * For custom domains:
   *   - TXT record for ownership verification
   */
  createRecord(opts: {
    zoneId: string;
    type: DnsRecord['type'];
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
    priority?: number;  // MX records require a priority
  }): Promise<DnsRecord>;

  /**
   * Delete a DNS record by its provider-assigned ID.
   */
  deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void>;

  /**
   * List all DNS records for a given name+type.
   * Used for polling verification.
   */
  listRecords(opts: { zoneId: string; name: string; type?: DnsRecord['type'] }): Promise<DnsRecord[]>;

  /**
   * Check if a specific DNS record exists and has the expected value.
   * Used by checkDns() to verify ownership / routing.
   */
  verifyRecord(opts: {
    zoneId: string;
    name: string;
    type: DnsRecord['type'];
    expectedContent: string;
    allowProxy?: boolean; // Cloudflare proxied: content differs from actual
  }): Promise<boolean>;

  /**
   * Get the zone ID for a given domain.
   * Cached after first call per provider instance.
   */
  getZoneId(domain: string): Promise<string | null>;

  /**
   * Create a platform subdomain DNS record.
   * E.g. "demo" → A record → server IP.
   * Idempotent: if already exists, returns the existing record.
   */
  createPlatformSubdomain(subdomain: string): Promise<DnsRecord>;

  /**
   * Delete a platform subdomain's DNS record.
   */
  deletePlatformSubdomain(subdomain: string): Promise<void>;
}
