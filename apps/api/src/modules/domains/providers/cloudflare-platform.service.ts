import { Injectable, Logger } from '@nestjs/common';
import { DnsProvider, DnsRecord } from '@/modules/domains/providers/dns-provider.interface';
import { CloudflareZoneService } from '@/modules/domains/providers/cloudflare-zone.service';

/**
 * Cloudflare implementation of DnsProvider.
 *
 * Uses the Cloudflare API v4 (https://api.cloudflare.com/client/v4).
 * Credentials are read from CLOUDFLARE_API_TOKEN_FILE (not the token directly)
 * so secrets never appear in env vars or code.
 *
 * Required token permissions:
 *   Zone:DNS:Edit for all DNS record operations
 *   Zone:Read for zone lookup
 */
@Injectable()
export class CloudflareDnsProvider implements DnsProvider {
  readonly name = 'cloudflare';

  private readonly logger = new Logger(CloudflareDnsProvider.name);

  constructor(private zoneService: CloudflareZoneService) {}

  async createRecord(opts: {
    zoneId: string;
    type: DnsRecord['type'];
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
    priority?: number;
  }): Promise<DnsRecord> {
    const { zoneId, type, name, content, ttl = 300, proxied = false, priority } = opts;
    const normalizedName = this.stripTrailingDot(name);

    this.logger.log(`[cloudflare] Creating ${type} record: ${normalizedName} -> ${content} (zone=${zoneId})`);

    const payload: Record<string, unknown> = {
      type,
      name: normalizedName,
      content,
      ttl,
      proxied,
    };

    if (type === 'MX' && priority !== undefined) {
      payload['priority'] = priority;
    }

    const response = await this.zoneService.clientRef.post(`/zones/${zoneId}/dns_records`, payload);

    if (!response.data.success) {
      const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
      throw new Error(`Cloudflare API error creating DNS record: ${errors}`);
    }

    const record = response.data.result;
    this.logger.log(`[cloudflare] Created DNS record id=${record.id} type=${type} name=${record.name}`);

    return this.mapRecord(record);
  }

  async deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void> {
    const { zoneId, recordId } = opts;

    this.logger.log(`[cloudflare] Deleting DNS record id=${recordId} (zone=${zoneId})`);

    const response = await this.zoneService.clientRef.delete(`/zones/${zoneId}/dns_records/${recordId}`);

    if (!response.data.success) {
      const isNotFound = response.data.errors?.some((e: any) => e.code === 81073);
      if (!isNotFound) {
        const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
        throw new Error(`Cloudflare API error deleting DNS record ${recordId}: ${errors}`);
      }
      this.logger.warn(`[cloudflare] Record ${recordId} already gone - ignoring`);
    }
  }

  async listRecords(opts: {
    zoneId: string;
    name: string;
    type?: DnsRecord['type'];
  }): Promise<DnsRecord[]> {
    const { zoneId, name, type } = opts;
    const normalizedName = this.stripTrailingDot(name);

    const params: Record<string, string> = { name: normalizedName };
    if (type) params['type'] = type;

    const response = await this.zoneService.clientRef.get(`/zones/${zoneId}/dns_records`, { params });

    if (!response.data.success) {
      const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
      throw new Error(`Cloudflare API error listing DNS records: ${errors}`);
    }

    return response.data.result.map((r: any) => this.mapRecord(r));
  }

  async verifyRecord(opts: {
    zoneId: string;
    name: string;
    type: DnsRecord['type'];
    expectedContent: string;
    allowProxy?: boolean;
  }): Promise<boolean> {
    const { zoneId, name, type, expectedContent, allowProxy = false } = opts;
    const records = await this.listRecords({ zoneId, name, type });

    if (records.length === 0) return false;

    return records.some(record => {
      if (allowProxy && record.proxied) {
        return true;
      }
      return record.content === expectedContent;
    });
  }

  async getZoneId(domain: string): Promise<string | null> {
    return this.zoneService.getZoneId(domain);
  }

  async createPlatformSubdomain(subdomain: string): Promise<DnsRecord> {
    const zoneId = await this.zoneService.getPlatformZoneId();
    const fullDomain = `${subdomain}.${this.zoneService.platformDomainRef}`;

    const existing = await this.listRecords({ zoneId, name: fullDomain });
    if (existing.length > 0) {
      this.logger.log(`[cloudflare] Record ${fullDomain} already exists, skipping create`);
      return existing[0];
    }

    return this.createRecord({
      zoneId,
      type: 'A',
      name: fullDomain,
      content: this.zoneService.serverIpRef,
      ttl: 300,
      proxied: false,
    });
  }

  async deletePlatformSubdomain(subdomain: string): Promise<void> {
    const zoneId = await this.zoneService.getPlatformZoneId();
    const fullDomain = `${subdomain}.${this.zoneService.platformDomainRef}`;

    const records = await this.listRecords({ zoneId, name: fullDomain });
    for (const record of records) {
      await this.deleteRecord({ zoneId, recordId: record.id });
    }
  }

  private stripTrailingDot(name: string): string {
    return name.endsWith('.') ? name.slice(0, -1) : name;
  }

  private mapRecord(raw: any): DnsRecord {
    return {
      id: raw.id,
      type: raw.type,
      name: raw.name,
      content: raw.content,
      proxied: raw.proxied,
      ttl: raw.ttl,
    };
  }
}
