import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CloudflareZoneService {
  private readonly logger = new Logger(CloudflareZoneService.name);
  private readonly client: AxiosInstance;
  private readonly platformDomain: string;
  private readonly serverIp: string;
  private zoneIdCache = new Map<string, string>();

  constructor(private configService: ConfigService) {
    const apiTokenFile = this.configService.get<string>('CLOUDFLARE_API_TOKEN_FILE');

    if (!apiTokenFile) {
      this.logger.warn(
        'CLOUDFLARE_API_TOKEN_FILE is not set - CloudflareZoneService is degraded. ' +
        'Domain management will not be available. Set CLOUDFLARE_API_TOKEN_FILE to enable.',
      );
      this.client = axios.create({ baseURL: 'https://api.cloudflare.com/client/v4', timeout: 10_000 });
      this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
      this.serverIp = this.configService.get<string>('SERVER_IP') ?? '0.0.0.0';
      return;
    }

    let token: string;
    try {
      token = require('fs').readFileSync(apiTokenFile, 'utf8').trim();
    } catch (err) {
      this.logger.warn(
        `CLOUDFLARE_API_TOKEN_FILE points to "${apiTokenFile}" but file could not be read: ${err instanceof Error ? err.message : err} - ` +
        'CloudflareZoneService is degraded. Domain management will not be available.',
      );
      this.client = axios.create({ baseURL: 'https://api.cloudflare.com/client/v4', timeout: 10_000 });
      this.platformDomain = this.configService.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
      this.serverIp = this.configService.get<string>('SERVER_IP') ?? '0.0.0.0';
      return;
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
      this.logger.warn(
        'SERVER_IP is not set - Phase 07 requires the VPS public IP to create DNS records. ' +
        'Using 0.0.0.0 as fallback. Set SERVER_IP in your environment.',
      );
    }
    this.serverIp = serverIpRaw ?? '0.0.0.0';
  }

  get clientRef() { return this.client; }
  get serverIpRef() { return this.serverIp; }
  get platformDomainRef() { return this.platformDomain; }

  /**
   * Get the Cloudflare zone ID for a domain.
   *
   * If the domain is a subdomain (e.g. deploy.fidscript.com) and no zone
   * exists for that exact name, walks up the domain labels to find the
   * nearest parent zone (e.g. fidscript.com). This handles the common case
   * where a zone is registered for the apex but not every subdomain.
   */
  async getZoneId(domain: string): Promise<string | null> {
    const normalized = this.stripTrailingDot(domain);
    if (this.zoneIdCache.has(normalized)) {
      return this.zoneIdCache.get(normalized)!;
    }

    const zoneId = await this.getZoneIdImpl(normalized);
    if (zoneId) {
      // Cache the result for the original domain so future lookups for this
      // specific subdomain are instant.
      this.zoneIdCache.set(normalized, zoneId);
    }
    return zoneId;
  }

  private async getZoneIdImpl(domain: string): Promise<string | null> {
    try {
      // First try exact match
      let response = await this.client.get('/zones', { params: { name: domain } });
      if (response.data.result?.length > 0) {
        const zoneId = response.data.result[0].id;
        this.logger.log(`[cloudflare] Zone ${domain} -> id=${zoneId}`);
        return zoneId;
      }

      // Try active filter
      response = await this.client.get('/zones', { params: { name: domain, status: 'active' } });
      if (response.data.result?.length > 0) {
        const zoneId = response.data.result[0].id;
        this.logger.log(`[cloudflare] Zone ${domain} (active) -> id=${zoneId}`);
        return zoneId;
      }

      // Subdomain walk: if no zone found, try stripping the left-most label.
      // e.g. deploy.fidscript.com -> fidscript.com -> com (no zone)
      const dotIndex = domain.indexOf('.');
      if (dotIndex === -1) return null;
      const parent = domain.slice(dotIndex + 1);
      const parentZone = await this.getZoneIdImpl(parent);
      if (parentZone) {
        this.logger.log(`[cloudflare] Zone ${domain} -> using parent zone ${parent} -> id=${parentZone}`);
      }
      return parentZone ?? null;
    } catch (err) {
      this.logger.error(`[cloudflare] Failed to get zone ID for ${domain}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

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

  private stripTrailingDot(name: string): string {
    return name.endsWith('.') ? name.slice(0, -1) : name;
  }
}
