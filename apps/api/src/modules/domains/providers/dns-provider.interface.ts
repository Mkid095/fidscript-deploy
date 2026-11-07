/**
 * DnsProvider interface — pluggable DNS provider for domain management.
 *
 * Caller (DomainsService) depends on this interface, never Cloudflare directly.
 * Development Rule 5: Never hardcode external services.
 *
 * Implementations: CloudflareDnsProvider, Route53DnsProvider, GoDaddyDnsProvider,
 * NamecheapDnsProvider. Selected at runtime by DnsProviderFactory based on the
 * DomainConnection's `provider` field.
 */

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV' | 'CAA';

export interface DnsRecord {
  id: string;
  type: DnsRecordType;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
  priority?: number; // MX records require a priority
}

export interface CreateRecordOpts {
  zoneId: string;
  type: DnsRecordType;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
}

export interface UpdateRecordOpts extends CreateRecordOpts {
  recordId: string;
}

export interface VerifyRecordOpts {
  zoneId: string;
  name: string;
  type: DnsRecordType;
  expectedContent: string;
  allowProxy?: boolean; // Cloudflare proxied: content differs from actual
}

export interface ZoneInfo {
  zoneId: string;
  zoneName: string; // e.g. "example.com"
}

export interface ImportResult {
  imported: number;
  warnings: string[];
  records: DnsRecord[]; // snapshot of all imported records
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  warnings: string[];
}

export interface DnsPlan {
  create: DnsRecord[];
  update: DnsRecord[];
  delete: DnsRecord[];
  warnings: string[];
}

export interface DnsProvider {
  /** Provider identifier: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' */
  readonly name: string;

  // ── Zone management ──────────────────────────────────────────────────────

  /**
   * Detect/find the zone for a given domain.
   * Walks up domain labels (api.example.com → example.com) to find the zone.
   * Returns null if no matching zone exists.
   */
  detectZone(domain: string): Promise<ZoneInfo | null>;

  /** Alias for detectZone — kept for backward compatibility with existing callers. */
  getZoneId(domain: string): Promise<string | null>;

  // ── Record CRUD ──────────────────────────────────────────────────────────

  /**
   * Create a DNS record in the provider's zone.
   * Returns the provider-assigned record ID.
   */
  createRecord(opts: CreateRecordOpts): Promise<DnsRecord>;

  /**
   * Update an existing DNS record.
   * Not all providers support in-place updates — some require delete+create.
   */
  updateRecord(opts: UpdateRecordOpts): Promise<void>;

  /**
   * Delete a DNS record by its provider-assigned ID.
   */
  deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void>;

  /**
   * List all DNS records for a given name+type.
   * Used for polling verification and zone import.
   */
  listRecords(opts: { zoneId: string; name?: string; type?: DnsRecordType }): Promise<DnsRecord[]>;

  /**
   * Check if a specific DNS record exists and has the expected value.
   * Used by checkDns() to verify ownership / routing.
   */
  verifyRecord(opts: VerifyRecordOpts): Promise<boolean>;

  // ── Zone import / sync ──────────────────────────────────────────────────

  /**
   * Import all existing DNS records from the provider for a domain's zone.
   * CRITICAL: This must be called BEFORE any auto-configuration to avoid
   * destroying existing production DNS records.
   *
   * Returns a snapshot of all records found.
   */
  importZone(domain: string): Promise<ImportResult>;

  /**
   * Sync the platform's desired DNS state with the provider's actual state.
   * Compares imported records vs platform-managed records and reconciles.
   * Never deletes records it didn't create (unless explicitly marked for removal).
   */
  syncZone(domainId: string): Promise<SyncResult>;

  /**
   * Generate a plan of changes that would be made by syncZone.
   * Shows create/update/delete actions + warnings before applying.
   * This is the "dry run" — always call before destructive operations.
   */
  planZone(domainId: string): Promise<DnsPlan>;

  // ── Platform subdomains (our own zone) ──────────────────────────────────

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
