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
      throw new Error(
        'CLOUDFLARE_API_TOKEN_FILE is not set - cannot initialize CloudflareZoneService. ' +
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

  get clientRef() { return this.client; }
  get serverIpRef() { return this.serverIp; }
  get platformDomainRef() { return this.platformDomain; }

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
