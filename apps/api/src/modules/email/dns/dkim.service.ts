import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { basicAuthHeader } from '@/common/basic-auth';
import { SecretsService } from '@/modules/infrastructure/secrets/secrets.service';
import { CloudflarePrimitive } from '@/modules/infrastructure/primitives/cloudflare.primitive';

/**
 * DKIM key management — refactored to consume the Infrastructure layer.
 *
 * Per the Infrastructure-first architecture:
 *   - Stalwart admin token: read from `SecretsService.get(null, 'STALWART_ADMIN_TOKEN')`
 *     (platform-level secret, not per-project). The DKIM key lives in Stalwart's
 *     internal store, which is platform-wide.
 *   - DNS provider: per-project. `CloudflarePrimitive.getDnsProvider(projectId)`
 *     returns a `DnsProvider` bound to the customer's Cloudflare OAuth token.
 *     This is what writes the DKIM TXT to the customer's zone — not the
 *     platform's.
 *
 * Stalwart v0.15.5 stores DKIM signing keys in its INTERNAL RocksDB store.
 * The private key never leaves Stalwart; this service only reads the public
 * key back and publishes it as a DNS TXT record.
 */
@Injectable()
export class DkimService {
  private readonly logger = new Logger(DkimService.name);
  private readonly dkimSelector = 'default';
  private readonly baseURL: string;
  private readonly adminToken: string;

  constructor(
    private secrets: SecretsService,
    private cloudflare: CloudflarePrimitive,
    private configService: ConfigService,
  ) {
    this.baseURL = this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080');
    // Platform-level secret. Read once at construction. If missing,
    // every DKIM call will throw — better than silent failure.
    this.adminToken = process.env.STALWART_ADMIN_TOKEN ?? '';
  }

  /** Authenticated call to the Stalwart management REST API (HTTP Basic). */
  private async stalwartApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await axios.request<T>({
      baseURL: this.baseURL,
      url: path,
      method,
      data: body,
      headers: {
        Authorization: basicAuthHeader('admin', this.adminToken),
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
      validateStatus: () => true,
    });
    return res.data;
  }

  async ensureKey(domain: string): Promise<void> {
    const data = await this.stalwartApi<{ data: unknown; error?: string }>('/api/dkim', 'POST', {
      id: domain,
      algorithm: 'Ed25519',
      domain,
      selector: this.dkimSelector,
    });
    if (data?.error === 'fieldAlreadyExists') {
      this.logger.log(`DKIM key already exists in Stalwart for ${domain} (selector ${this.dkimSelector})`);
    } else if (data?.error) {
      throw new Error(`Stalwart DKIM create failed for ${domain}: ${data.error}`);
    } else {
      this.logger.log(`DKIM key created in Stalwart for ${domain} (selector ${this.dkimSelector})`);
    }
  }

  async getPublicKey(id = this.dkimSelector): Promise<string> {
    const data = await this.stalwartApi<{ data?: string; error?: string }>(`/api/dkim/${encodeURIComponent(id)}`);
    if (!data?.data) throw new Error(`Stalwart returned no DKIM public key for id ${id}: ${JSON.stringify(data)}`);
    return data.data;
  }

  /**
   * Publish the DKIM public key as a DNS TXT record. Uses the
   * per-project Cloudflare DNS provider — the TXT goes into the
   * customer's zone, not the platform's.
   *
   * `projectId` is required so the Infrastructure layer can resolve
   * the right Cloudflare OAuth token.
   */
  async publishDns(projectId: string, domain: string, publicKeyB64: string): Promise<void> {
    const dns = await this.cloudflare.getDnsProvider(projectId);
    if (!dns) throw new Error(`No Cloudflare connection for project ${projectId}.`);
    const zoneId = await dns.getZoneId(domain);
    if (!zoneId) throw new Error(`DNS zone for ${domain} not found.`);
    const recordName = `${this.dkimSelector}._domainkey.${domain}`;
    const txt = `v=DKIM1; k=ed25519; p=${publicKeyB64}`;
    await dns.createRecord({ zoneId, type: 'TXT', name: recordName, content: txt, ttl: 3600 });
    this.logger.log(`DKIM TXT record published: ${recordName}`);
  }

  get selector(): string {
    return this.dkimSelector;
  }

  async getZoneId(projectId: string, domain: string): Promise<string> {
    const dns = await this.cloudflare.getDnsProvider(projectId);
    if (!dns) throw new Error(`No Cloudflare connection for project ${projectId}.`);
    const zoneId = await dns.getZoneId(domain);
    if (!zoneId) throw new Error(`DNS zone for ${domain} not found.`);
    return zoneId;
  }
}
