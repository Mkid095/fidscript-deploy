import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DnsProvider, DnsRecord } from './dns-provider.interface';

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
 *
 * Required token scope: either:
 *   - Account-wide token with Zone:DNS:Edit for deploy.fidscript.com
 *   - Specific zone token for deploy.fidscript.com
 */
@Injectable()
export class CloudflareDnsProvider implements DnsProvider {
  readonly name = 'cloudflare';

  private readonly logger = new Logger(CloudflareDnsProvider.name);
  private readonly client: AxiosInstance;
  private readonly platformDomain: string;
  private readonly serverIp: string;
  private zoneIdCache = new Map<string, string>();

  constructor(private configService: ConfigService) {
    const apiTokenFile = this.configService.get<string>('CLOUDFLARE_API_TOKEN_FILE');
    if (!apiTokenFile) {
      throw new Error(
        'CLOUDFLARE_API_TOKEN_FILE is not set - cannot initialize CloudflareDnsProvider. ' +
        'Phase 07 requires a Cloudflare API token with Zone:DNS:Edit permissions for deploy.fidscript.com.',
      );
    }

    let token: string;
    try {
      token = require('fs').readFileSync(apiTokenFile, 'utf8').trim();
    } catch (err) {
      throw new Error(
        `CLOUDFLARE_API_TOKEN_FILE points to "${apiTokenFile}" but file could not be read: ${err instanceof Error ? err.message : err}`,
      );
    }

    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });

    this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const serverIpRaw = this.configService.get<string>('SERVER_IP');
    if (!serverIpRaw) {
      throw new Error(
        'SERVER_IP is not set - Phase 07 requires the VPS public IP to create DNS records. ' +
        'Set SERVER_IP in your environment.',
      );
    }
    this.serverIp = serverIpRaw;
  }

  // ─────────────────────────────────────────────────────────────
  // DnsProvider implementation
  // ─────────────────────────────────────────────────────────────

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

    // MX records require a priority field
    if (type === 'MX' && priority !== undefined) {
      payload['priority'] = priority;
    }

    const response = await this.client.post(`/zones/${zoneId}/dns_records`, payload);

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

    const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);

    if (!response.data.success) {
      // 81073 = record not found; treat as success
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

    const response = await this.client.get(`/zones/${zoneId}/dns_records`, { params });

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
    const normalized = this.stripTrailingDot(domain);
    if (this.zoneIdCache.has(normalized)) {
      return this.zoneIdCache.get(normalized)!;
    }

    try {
      const response = await this.client.get('/zones', { params: { name: normalized } });

      if (response.data.result?.length > 0) {
        const zoneId = response.data.result[0].id;
        this.zoneIdCache.set(normalized, zoneId);
        this.logger.log(`[cloudflare] Zone ${normalized} -> id=${zoneId}`);
        return zoneId;
      }

      const searchResponse = await this.client.get('/zones', {
        params: { name: normalized, status: 'active' },
      });

      if (searchResponse.data.result?.length > 0) {
        const zoneId = searchResponse.data.result[0].id;
        this.zoneIdCache.set(normalized, zoneId);
        return zoneId;
      }

      return null;
    } catch (err) {
      this.logger.error(`[cloudflare] Failed to get zone ID for ${domain}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Platform subdomain helpers
  // ─────────────────────────────────────────────────────────────

  /** Platform zone ID - cached after first lookup. */
  async getPlatformZoneId(): Promise<string> {
    const zoneId = await this.getZoneId(this.platformDomain);
    if (!zoneId) {
      throw new Error(
        `Cloudflare zone for ${this.platformDomain} not found. ` +
        'Ensure the API token has Zone:DNS:Edit permission for this zone.',
      );
    }
    return zoneId;
  }

  /**
   * Create a platform subdomain DNS record:
   *   <subdomain>.apps.deploy.fidscript.com -> A -> SERVER_IP
   *
   * Idempotent: if the record already exists, returns it without error.
   */
  async createPlatformSubdomain(subdomain: string): Promise<DnsRecord> {
    const zoneId = await this.getPlatformZoneId();
    const fullDomain = `${subdomain}.${this.platformDomain}`;

    const existing = await this.listRecords({ zoneId, name: fullDomain });
    if (existing.length > 0) {
      this.logger.log(`[cloudflare] Record ${fullDomain} already exists, skipping create`);
      return existing[0];
    }

    return this.createRecord({
      zoneId,
      type: 'A',
      name: fullDomain,
      content: this.serverIp,
      ttl: 300,
      proxied: false,
    });
  }

  /** Delete a platform subdomain's DNS record. */
  async deletePlatformSubdomain(subdomain: string): Promise<void> {
    const zoneId = await this.getPlatformZoneId();
    const fullDomain = `${subdomain}.${this.platformDomain}`;

    const records = await this.listRecords({ zoneId, name: fullDomain });
    for (const record of records) {
      await this.deleteRecord({ zoneId, recordId: record.id });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

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
