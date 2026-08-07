import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  DnsProvider,
  DnsRecord,
  DnsRecordType,
  ZoneInfo,
  CreateRecordOpts,
  SyncResult,
  ImportResult,
  DnsPlan,
} from '@/modules/domains/providers/dns-provider.interface';

/**
 * ProjectCloudflareProvider — DnsProvider bound to a single project's
 * Cloudflare OAuth token. Different from `CloudflareDnsProvider` which
 * reads the platform-level `CLOUDFLARE_API_TOKEN_FILE` at boot.
 */
@Injectable()
export class ProjectCloudflareProvider implements DnsProvider {
  readonly name = 'project-cloudflare';
  private readonly logger = new Logger(ProjectCloudflareProvider.name);
  private readonly client: AxiosInstance;
  private readonly zoneIdHint: string | undefined;
  private zoneIdCache = new Map<string, string>();

  constructor(token: string, zoneIdHint?: string) {
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });
    this.zoneIdHint = zoneIdHint;
  }

  private async resolveZoneId(domain: string): Promise<string> {
    if (this.zoneIdHint) return this.zoneIdHint;
    const cached = this.zoneIdCache.get(domain);
    if (cached) return cached;
    const res = await this.client.get('/zones', { params: { name: domain } });
    const zones = res.data?.result as Array<{ id: string; name: string }> | undefined;
    if (!zones || zones.length === 0) {
      throw new Error(`No Cloudflare zone found for ${domain}`);
    }
    const match = zones
      .filter((z) => domain === z.name || domain.endsWith(`.${z.name}`))
      .sort((a, b) => b.name.length - a.name.length)[0];
    if (!match) throw new Error(`No matching Cloudflare zone for ${domain}`);
    this.zoneIdCache.set(domain, match.id);
    return match.id;
  }

  async getZoneId(domain: string): Promise<string | null> {
    try {
      return await this.resolveZoneId(domain);
    } catch {
      return null;
    }
  }

  async createRecord(opts: CreateRecordOpts): Promise<DnsRecord> {
    const zoneId = await this.resolveZoneId(opts.name.split('.').slice(-2).join('.'));
    const res = await this.client.post(`/zones/${zoneId}/dns_records`, opts);
    if (!res.data?.success) {
      throw new Error(`Cloudflare createRecord failed: ${JSON.stringify(res.data?.errors)}`);
    }
    return res.data.result as DnsRecord;
  }

  async updateRecord(opts: { zoneId: string; recordId: string; type: DnsRecordType; name: string; content: string; ttl?: number; priority?: number; proxied?: boolean }): Promise<void> {
    const res = await this.client.put(`/zones/${opts.zoneId}/dns_records/${opts.recordId}`, opts);
    if (!res.data?.success) {
      throw new Error(`Cloudflare updateRecord failed: ${JSON.stringify(res.data?.errors)}`);
    }
  }

  async deleteRecord(input: { zoneId: string; recordId: string }): Promise<void> {
    const res = await this.client.delete(`/zones/${input.zoneId}/dns_records/${input.recordId}`);
    if (!res.data?.success) {
      throw new Error(`Cloudflare deleteRecord failed: ${JSON.stringify(res.data?.errors)}`);
    }
  }

  async listRecords(opts: { zoneId: string; name?: string; type?: DnsRecordType }): Promise<DnsRecord[]> {
    const params: Record<string, string> = {};
    if (opts.name) params.name = opts.name;
    if (opts.type) params.type = opts.type;
    const res = await this.client.get(`/zones/${opts.zoneId}/dns_records`, { params });
    return (res.data?.result as DnsRecord[]) ?? [];
  }

  async detectZone(domain: string): Promise<ZoneInfo | null> {
    const zoneId = await this.getZoneId(domain);
    if (!zoneId) return null;
    const res = await this.client.get(`/zones/${zoneId}`);
    return res.data?.result as ZoneInfo;
  }

  async verifyRecord(): Promise<boolean> {
    return true;
  }

  async importZone(domain: string): Promise<ImportResult> {
    return { imported: 0, warnings: ['importZone not supported on ProjectCloudflareProvider'], records: [] };
  }
  async syncZone(_domainId: string): Promise<SyncResult> {
    return { created: 0, updated: 0, deleted: 0, warnings: ['syncZone not supported on ProjectCloudflareProvider'] };
  }
  async planZone(_domainId: string): Promise<DnsPlan> {
    return { create: [], update: [], delete: [], warnings: [] };
  }
  async createPlatformSubdomain(_subdomain: string): Promise<DnsRecord> {
    throw new Error('createPlatformSubdomain is platform-level; not project-scoped.');
  }
  async deletePlatformSubdomain(_subdomain: string): Promise<void> {
    throw new Error('deletePlatformSubdomain is platform-level; not project-scoped.');
  }
}
