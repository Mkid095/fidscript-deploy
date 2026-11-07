import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  DnsProvider, DnsRecord, CreateRecordOpts, UpdateRecordOpts, VerifyRecordOpts,
  ZoneInfo, ImportResult, SyncResult, DnsPlan, DnsRecordType,
} from './dns-provider.interface';
import type { ProviderConnection } from './dns-provider-factory';

/**
 * NamecheapDnsProvider — Namecheap implementation of DnsProvider.
 *
 * Uses the Namecheap API (https://api.namecheap.com/xml.reply).
 * Credentials come from DomainConnection.credentials: { apiUser, apiKey, clientIp }.
 *
 * Namecheap uses XML responses with an API user model. Each API call requires:
 *   ApiUser, ApiKey, UserName (usually same as ApiUser), ClientIp.
 *
 * Note: Namecheap's API only supports advanced DNS record management on
 * domains that have "Premium DNS" or "Advanced DNS" enabled.
 *
 * Alternative: if the user has Namecheap domains pointing to custom nameservers
 * (not Namecheap's default), they should use the appropriate DNS provider instead.
 */
export class NamecheapDnsProvider implements DnsProvider {
  readonly name = 'namecheap';
  private readonly logger = new Logger(NamecheapDnsProvider.name);
  private readonly apiUser: string;
  private readonly apiKey: string;
  private readonly clientIp: string;
  private readonly baseUrl = 'https://api.namecheap.com/xml.reply';

  constructor(private connection: ProviderConnection) {
    const creds = (connection.credentials ?? {}) as Record<string, string>;
    this.apiUser = creds.apiUser ?? '';
    this.apiKey = creds.apiKey ?? '';
    this.clientIp = creds.clientIp ?? '';
  }

  private get baseParams() {
    return {
      ApiUser: this.apiUser,
      ApiKey: this.apiKey,
      UserName: this.apiUser,
      ClientIp: this.clientIp,
    };
  }

  /** Extract the base domain (zone) from a hostname. */
  private extractZone(domain: string): string {
    const labels = domain.replace(/\.$/, '').split('.');
    if (labels.length <= 2) return domain.replace(/\.$/, '');
    return labels.slice(-2).join('.');
  }

  async detectZone(domain: string): Promise<ZoneInfo | null> {
    const zoneName = this.extractZone(domain);
    try {
      // Check if domain exists in the account via namecheap.domains.getList
      const response = await axios.get(this.baseUrl, {
        params: {
          ...this.baseParams,
          Command: 'namecheap.domains.dns.getHosts',
          SLD: zoneName.split('.')[0],
          TLD: zoneName.split('.').slice(1).join('.'),
        },
        timeout: 15_000,
      });
      if (response.data && response.data.includes('DomainGetHostsResult')) {
        return { zoneId: zoneName, zoneName };
      }
    } catch (err) {
      this.logger.debug(`[namecheap] Zone not found for ${zoneName}: ${err instanceof Error ? err.message : err}`);
    }
    return null;
  }

  async getZoneId(domain: string): Promise<string | null> {
    const zoneInfo = await this.detectZone(domain);
    return zoneInfo?.zoneId ?? null;
  }

  private parseHosts(xml: string, zoneName: string): DnsRecord[] {
    // Simple regex-based XML parsing (Namecheap returns XML)
    const records: DnsRecord[] = [];
    const hostRegex = /<host[^>]*HostName="([^"]*)"[^>]*RecordType="([^"]*)"[^>]*Address="([^"]*)"[^>]*TTL="([^"]*)"(?:[^>]*MXPref="([^"]*)")?[^>]*\/>/gi;
    let match: RegExpExecArray | null;
    while ((match = hostRegex.exec(xml)) !== null) {
      const [, name, type, address, ttl, mxPref] = match;
      records.push({
        id: `${name}:${type}`,
        type: type.toUpperCase() as DnsRecordType,
        name: name === '@' ? zoneName : `${name}.${zoneName}`,
        content: address,
        ttl: parseInt(ttl, 10) || 1800,
        priority: mxPref ? parseInt(mxPref, 10) : undefined,
      });
    }
    return records;
  }

  async createRecord(opts: CreateRecordOpts): Promise<DnsRecord> {
    const zoneName = this.extractZone(opts.name);
    const [sld, ...tldParts] = zoneName.split('.');
    const tld = tldParts.join('.');
    const relativeName = opts.name.replace(new RegExp(`\\.?${zoneName}$`), '') || '@';

    // Namecheap uses setHosts to add records. Each call replaces all hosts,
    // so we need to fetch existing + append. This is inherently not atomic.
    const existing = await this.listRecords({ zoneId: zoneName });

    this.logger.log(`[namecheap] Adding ${opts.type} record: ${opts.name} -> ${opts.content}`);

    // Build the full host list including the new record
    const allHosts: Array<{ HostName: string; RecordType: string; Address: string; TTL: number; MXPref: number }> = [
      ...existing.map(r => ({
        HostName: r.name.replace(new RegExp(`\\.?${zoneName}$`), '') || '@',
        RecordType: r.type,
        Address: r.content,
        TTL: r.ttl ?? 1800,
        MXPref: r.priority ?? 10,
      })),
      {
        HostName: relativeName,
        RecordType: opts.type,
        Address: opts.content,
        TTL: opts.ttl ?? 1800,
        MXPref: opts.priority ?? 10,
      },
    ];

    const params: Record<string, string | number> = {
      ...this.baseParams,
      Command: 'namecheap.domains.dns.setHosts',
      SLD: sld,
      TLD: tld,
    };
    allHosts.forEach((h, i) => {
      params[`HostName${i + 1}`] = h.HostName;
      params[`RecordType${i + 1}`] = h.RecordType;
      params[`Address${i + 1}`] = h.Address;
      params[`TTL${i + 1}`] = h.TTL;
      params[`MXPref${i + 1}`] = h.MXPref;
    });

    await axios.get(this.baseUrl, { params, timeout: 15_000 });

    return {
      id: `${relativeName}:${opts.type}`,
      type: opts.type,
      name: opts.name,
      content: opts.content,
      ttl: opts.ttl ?? 1800,
      priority: opts.priority,
    };
  }

  async updateRecord(opts: UpdateRecordOpts): Promise<void> {
    // Namecheap doesn't support in-place updates — delete + create
    await this.deleteRecord({ zoneId: opts.zoneId, recordId: opts.recordId });
    await this.createRecord(opts);
    this.logger.log(`[namecheap] Updated record ${opts.name} (${opts.type})`);
  }

  async deleteRecord(opts: { zoneId: string; recordId: string }): Promise<void> {
    const [name, type] = opts.recordId.split(':');
    const existing = await this.listRecords({ zoneId: opts.zoneId });
    const filtered = existing.filter(r => !(r.name.endsWith(name) && r.type === type));

    const [sld, ...tldParts] = opts.zoneId.split('.');
    const tld = tldParts.join('.');

    const params: Record<string, string | number> = {
      ...this.baseParams,
      Command: 'namecheap.domains.dns.setHosts',
      SLD: sld,
      TLD: tld,
    };
    filtered.forEach((r, i) => {
      const relName = r.name.replace(new RegExp(`\\.?${opts.zoneId}$`), '') || '@';
      params[`HostName${i + 1}`] = relName;
      params[`RecordType${i + 1}`] = r.type;
      params[`Address${i + 1}`] = r.content;
      params[`TTL${i + 1}`] = r.ttl ?? 1800;
      params[`MXPref${i + 1}`] = r.priority ?? 10;
    });

    await axios.get(this.baseUrl, { params, timeout: 15_000 });
    this.logger.log(`[namecheap] Deleted record ${opts.recordId}`);
  }

  async listRecords(opts: { zoneId: string; name?: string; type?: DnsRecordType }): Promise<DnsRecord[]> {
    const [sld, ...tldParts] = opts.zoneId.split('.');
    const tld = tldParts.join('.');
    const response = await axios.get(this.baseUrl, {
      params: {
        ...this.baseParams,
        Command: 'namecheap.domains.dns.getHosts',
        SLD: sld,
        TLD: tld,
      },
      timeout: 15_000,
    });

    let records = this.parseHosts(response.data, opts.zoneId);
    if (opts.name) records = records.filter(r => r.name === opts.name || r.name === `${opts.name}.${opts.zoneId}`);
    if (opts.type) records = records.filter(r => r.type === opts.type);
    return records;
  }

  async verifyRecord(opts: VerifyRecordOpts): Promise<boolean> {
    const zoneName = this.extractZone(opts.name);
    const records = await this.listRecords({
      zoneId: zoneName,
      name: opts.name,
      type: opts.type,
    });
    return records.some(r => r.content === opts.expectedContent);
  }

  async importZone(domain: string): Promise<ImportResult> {
    const zoneInfo = await this.detectZone(domain);
    if (!zoneInfo) {
      return { imported: 0, warnings: [`No Namecheap zone found for ${domain}`], records: [] };
    }
    const records = await this.listRecords({ zoneId: zoneInfo.zoneId });
    this.logger.log(`[namecheap] Imported ${records.length} records from zone ${zoneInfo.zoneName}`);
    return { imported: records.length, warnings: [], records };
  }

  async syncZone(_domainId: string): Promise<SyncResult> {
    this.logger.warn(`[namecheap] syncZone not yet implemented for domain ${_domainId}`);
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
