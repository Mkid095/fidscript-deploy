import { Injectable, Logger } from '@nestjs/common';
import {
  DnsProvider, DnsRecord, CreateRecordOpts, UpdateRecordOpts, VerifyRecordOpts,
  ZoneInfo, ImportResult, SyncResult, DnsPlan,
} from '@/modules/domains/providers/dns-provider.interface';
import { CloudflareZoneService } from '@/modules/domains/providers/cloudflare-zone.service';
import { CloudflareDnsMappersService } from './cloudflare-dns-mappers.service';

/** Cloudflare implementation of DnsProvider. Uses Cloudflare API v4. */
@Injectable()
export class CloudflareDnsProvider implements DnsProvider {
  readonly name = 'cloudflare';
  private readonly logger = new Logger(CloudflareDnsProvider.name);

  constructor(
    private zoneService: CloudflareZoneService,
    private mappers: CloudflareDnsMappersService,
  ) {}

  async createRecord(opts: CreateRecordOpts): Promise<DnsRecord> {
    const { zoneId, type, name, content, ttl = 300, proxied = false, priority } = opts;
    const normalizedName = this.mappers.stripTrailingDot(name);
    this.logger.log(`[cloudflare] Creating ${type} record: ${normalizedName} -> ${content} (zone=${zoneId})`);

    const payload: Record<string, unknown> = { type, name: normalizedName, content, ttl, proxied };
    if (type === 'MX' && priority !== undefined) payload['priority'] = priority;

    const response = await this.zoneService.clientRef.post(`/zones/${zoneId}/dns_records`, payload);
    if (!response.data.success) {
      const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
      throw new Error(`Cloudflare API error creating DNS record: ${errors}`);
    }
    const record = response.data.result;
    this.logger.log(`[cloudflare] Created DNS record id=${record.id} type=${type} name=${record.name}`);
    return this.mappers.mapRecord(record);
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

  async listRecords(opts: { zoneId: string; name?: string; type?: DnsRecord['type'] }): Promise<DnsRecord[]> {
    const { zoneId, name, type } = opts;
    const params: Record<string, string> = {};
    if (name) params['name'] = this.mappers.stripTrailingDot(name);
    if (type) params['type'] = type;
    const response = await this.zoneService.clientRef.get(`/zones/${zoneId}/dns_records`, { params });
    if (!response.data.success) {
      const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
      throw new Error(`Cloudflare API error listing DNS records: ${errors}`);
    }
    return response.data.result.map((r: any) => this.mappers.mapRecord(r));
  }

  async updateRecord(opts: UpdateRecordOpts): Promise<void> {
    const { zoneId, recordId, type, name, content, ttl = 300, proxied = false, priority } = opts;
    const payload: Record<string, unknown> = {
      type, name: this.mappers.stripTrailingDot(name), content, ttl, proxied,
    };
    if (type === 'MX' && priority !== undefined) payload['priority'] = priority;
    const response = await this.zoneService.clientRef.put(`/zones/${zoneId}/dns_records/${recordId}`, payload);
    if (!response.data.success) {
      const errors = response.data.errors?.map((e: any) => e.message).join(', ') || 'unknown';
      throw new Error(`Cloudflare API error updating DNS record ${recordId}: ${errors}`);
    }
    this.logger.log(`[cloudflare] Updated DNS record id=${recordId}`);
  }

  async verifyRecord(opts: VerifyRecordOpts): Promise<boolean> {
    const { zoneId, name, type, expectedContent, allowProxy = false } = opts;
    const records = await this.listRecords({ zoneId, name, type });
    if (records.length === 0) return false;
    return records.some(record => allowProxy && record.proxied || record.content === expectedContent);
  }

  async getZoneId(domain: string): Promise<string | null> {
    return this.zoneService.getZoneId(domain);
  }

  async detectZone(domain: string): Promise<ZoneInfo | null> {
    const zoneId = await this.zoneService.getZoneId(domain);
    if (!zoneId) return null;
    // Derive zone name by walking up domain labels
    const labels = domain.split('.');
    let zoneName = domain;
    for (let i = 1; i < labels.length - 1; i++) {
      zoneName = labels.slice(i).join('.');
      const id = await this.zoneService.getZoneId(zoneName);
      if (id === zoneId) break;
    }
    return { zoneId, zoneName };
  }

  async importZone(domain: string): Promise<ImportResult> {
    const zoneInfo = await this.detectZone(domain);
    if (!zoneInfo) {
      return { imported: 0, warnings: [`No Cloudflare zone found for ${domain}`], records: [] };
    }
    const records = await this.listRecords({ zoneId: zoneInfo.zoneId });
    this.logger.log(`[cloudflare] Imported ${records.length} records from zone ${zoneInfo.zoneName}`);
    return {
      imported: records.length,
      warnings: [],
      records,
    };
  }

  async syncZone(_domainId: string): Promise<SyncResult> {
    // Zone sync requires comparing platform-managed records vs actual records.
    // For now, this is a no-op stub — full reconciliation is Phase 4.
    this.logger.warn(`[cloudflare] syncZone not yet implemented for domain ${_domainId}`);
    return { created: 0, updated: 0, deleted: 0, warnings: ['Sync not yet implemented'] };
  }

  async planZone(_domainId: string): Promise<DnsPlan> {
    // DNS plan preview — full implementation in Phase 4.
    return { create: [], update: [], delete: [], warnings: ['Plan not yet implemented'] };
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
      zoneId, type: 'A', name: fullDomain,
      content: this.zoneService.serverIpRef, ttl: 300, proxied: false,
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
}
