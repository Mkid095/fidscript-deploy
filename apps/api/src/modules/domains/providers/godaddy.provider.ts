import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  DnsProvider, DnsRecord, CreateRecordOpts, UpdateRecordOpts, VerifyRecordOpts,
  ZoneInfo, ImportResult, SyncResult, DnsPlan, DnsRecordType,
} from './dns-provider.interface';
import type { ProviderConnection } from './dns-provider-factory';

/**
 * GoDaddyDnsProvider — GoDaddy implementation of DnsProvider.
 *
 * Uses the GoDaddy API v1 (https://api.godaddy.com/v1/domains/{domain}/records).
 * Credentials come from DomainConnection.credentials: { apiKey, apiSecret }.
 *
 * GoDaddy uses a "shopper" ID + API key/secret. The API key format is:
 *   Key: e.g. "dL4ExampleKey"
 *   Secret: e.g. "ExampleSecret123456"
 *
 * Record format: [{ type, name, data, ttl, priority }]
 * Note: GoDaddy zone = domain name itself (no separate zone ID).
 */
export class GoDaddyDnsProvider implements DnsProvider {
  readonly name = 'godaddy';
  private readonly logger = new Logger(GoDaddyDnsProvider.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl = 'https://api.godaddy.com/v1';

  constructor(private connection: ProviderConnection) {
    const creds = (connection.credentials ?? {}) as Record<string, string>;
    this.apiKey = creds.apiKey ?? '';
    this.apiSecret = creds.apiSecret ?? '';
  }

  private get headers() {
    return {
      Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  /** Extract the base domain (zone) from a hostname. GoDaddy zone = the domain. */
  private extractZone(domain: string): string {
    const labels = domain.replace(/\.$/, '').split('.');
    // For simple TLDs: last 2 labels. For .co.uk etc: last 3 labels.
    // Simplified: assume 2-label zones (example.com). Can be extended.
    if (labels.length <= 2) return domain.replace(/\.$/, '');
    return labels.slice(-2).join('.');
  }

  async detectZone(domain: string): Promise<ZoneInfo | null> {
    const zoneName = this.extractZone(domain);
    try {
      const response = await axios.get(`${this.baseUrl}/domains/${zoneName}`, {
        headers: this.headers,
        timeout: 10_000,
      });
      if (response.status === 200) {
        return { zoneId: zoneName, zoneName };
      }
    } catch (err) {
      this.logger.debug(`[godaddy] Zone not found for ${zoneName}: ${err instanceof Error ? err.message : err}`);
    }
    return null;
  }

  async getZoneId(domain: string): Promise<string | null> {
    const zoneInfo = await this.detectZone(domain);
    return zoneInfo?.zoneId ?? null;
  }

  async createRecord(opts: CreateRecordOpts): Promise<DnsRecord> {
    const zoneName = this.extractZone(opts.name);
    // Name relative to zone (e.g. "api" for "api.example.com" in zone "example.com")
    const relativeName = opts.name.replace(new RegExp(`\\.?${zoneName}$`), '') || '@';

    this.logger.log(`[godaddy] Creating ${opts.type} record: ${opts.name} -> ${opts.content}`);
    await axios.put(
      `${this.baseUrl}/domains/${zoneName}/records/${opts.type}/${relativeName}`,
      [{
        type: opts.type,
        name: relativeName,
        data: opts.content,
        ttl: opts.ttl ?? 3600,
        priority: opts.type === 'MX' ? opts.priority : undefined,
        port: 1,
        protocol: 'https',
        service: 'fidscript',
        weight: 1,
      }],
      { headers: this.headers, timeout: 10_000 },
    );

    return {
      id: `${relativeName}:${opts.type}`,
      type: opts.type,
      name: opts.name,
      content: opts.content,
      ttl: opts.ttl ?? 3600,
      priority: opts.priority,
    };
  }

  async updateRecord(opts: UpdateRecordOpts): Promise<void> {
    // GoDaddy PUT replaces all records at the name+type — effectively an update
    await this.createRecord(opts);
    this.logger.log(`[godaddy] Updated record ${opts.name} (${opts.type})`);
  }

  async deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void> {
    const [name, type] = opts.recordId.split(':');
    await axios.delete(
      `${this.baseUrl}/domains/${opts.zoneId}/records/${type}/${name}`,
      { headers: this.headers, timeout: 10_000 },
    );
    this.logger.log(`[godaddy] Deleted record ${opts.recordId}`);
  }

  async listRecords(opts: { zoneId: string; name?: string; type?: DnsRecordType }): Promise<DnsRecord[]> {
    const url = opts.name
      ? `${this.baseUrl}/domains/${opts.zoneId}/records/${opts.type ?? ''}/${opts.name}`
      : `${this.baseUrl}/domains/${opts.zoneId}/records`;
    const response = await axios.get(url, { headers: this.headers, timeout: 10_000 });

    return (response.data as any[])
      .filter((r: any) => !opts.type || r.type === opts.type)
      .map((r: any) => ({
        id: `${r.name}:${r.type}`,
        type: r.type as DnsRecordType,
        name: r.name === '@' ? opts.zoneId : `${r.name}.${opts.zoneId}`,
        content: r.data,
        ttl: r.ttl ?? 3600,
        priority: r.priority,
      }));
  }

  async verifyRecord(opts: VerifyRecordOpts): Promise<boolean> {
    const zoneName = this.extractZone(opts.name);
    const records = await this.listRecords({
      zoneId: zoneName,
      name: opts.name.replace(new RegExp(`\\.?${zoneName}$`), '') || '@',
      type: opts.type,
    });
    return records.some(r => r.content === opts.expectedContent);
  }

  async importZone(domain: string): Promise<ImportResult> {
    const zoneInfo = await this.detectZone(domain);
    if (!zoneInfo) {
      return { imported: 0, warnings: [`No GoDaddy zone found for ${domain}`], records: [] };
    }
    const records = await this.listRecords({ zoneId: zoneInfo.zoneId });
    this.logger.log(`[godaddy] Imported ${records.length} records from zone ${zoneInfo.zoneName}`);
    return { imported: records.length, warnings: [], records };
  }

  async syncZone(_domainId: string): Promise<SyncResult> {
    this.logger.warn(`[godaddy] syncZone not yet implemented for domain ${_domainId}`);
    return { created: 0, updated: 0, deleted: 0, warnings: ['Sync not yet implemented'] };
  }

  async planZone(_domainId: string): Promise<DnsPlan> {
    return { create: [], update: [], delete: [], warnings: ['Plan not yet implemented'] };
  }

  async createPlatformSubdomain(_subdomain: string): Promise<DnsRecord> {
    throw new Error('Platform subdomains are only supported on the platform Cloudflare zone');
  }

  async deletePlatformSubdomain(_subdomain: string): Promise<void> {
    throw new Error('Platform subdomains are only supported on the platform Cloudflare zone');
  }
}
