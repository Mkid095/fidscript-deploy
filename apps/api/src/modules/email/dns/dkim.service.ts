import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DnsProvider } from '@/modules/domains/providers/dns-provider.interface';
import axios from 'axios';

/**
 * DKIM key management via Stalwart's management API.
 *
 * Stalwart v0.15.5 stores DKIM signing keys in its INTERNAL RocksDB store —
 * NOT on the filesystem. Keys are created/read over the management REST API:
 *
 *   POST /api/dkim        { id, algorithm, domain, selector }   → create
 *   GET  /api/dkim/{id}                                        → { data: "<base64 pubkey>" }
 *
 * The private key never leaves Stalwart; this service only reads the public
 * key back and publishes it as a DNS TXT record. Stalwart signs outbound
 * mail when the `[auth.dkim] sign` rule (in config.toml) maps the sender
 * domain to a signature id. We use the domain itself as the signature id so
 * every tenant gets a unique key (signature ids are global in Stalwart).
 *
 * NOTE: An earlier design wrote PEM files to a shared volume expecting
 * Stalwart to read them — that was wrong (Stalwart never reads key files),
 * so signing never happened. This is the correct path.
 */
@Injectable()
export class DkimService {
  private readonly logger = new Logger(DkimService.name);
  private readonly dkimSelector = 'default';
  private readonly baseURL: string;
  private readonly adminToken: string;

  constructor(
    @Inject('DNS_PROVIDER') private dnsProvider: DnsProvider,
    private configService: ConfigService,
  ) {
    this.baseURL = this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080');
    this.adminToken = this.configService.get('STALWART_ADMIN_TOKEN', '');
  }

  /** Authenticated call to the Stalwart management REST API (HTTP Basic). */
  private async stalwartApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const credentials = Buffer.from(`admin:${this.adminToken}`).toString('base64');
    const res = await axios.request<T>({
      baseURL: this.baseURL,
      url: path,
      method,
      data: body,
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      timeout: 15_000,
      // Stalwart returns 200 with an {error:...} body for logical failures
      // (e.g. fieldAlreadyExists); don't throw on non-2xx, inspect the body.
      validateStatus: () => true,
    });
    return res.data;
  }

  /**
   * Ensure an Ed25519 DKIM signing key exists in Stalwart for the domain.
   * Idempotent: re-running for an existing domain is a no-op. Signature id
   * is the domain (globally unique), selector is "default".
   */
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

  /** Read the base64 public key for a signature (default: the domain's own id). */
  async getPublicKey(id = this.dkimSelector): Promise<string> {
    const data = await this.stalwartApi<{ data?: string; error?: string }>(`/api/dkim/${encodeURIComponent(id)}`);
    if (!data?.data) throw new Error(`Stalwart returned no DKIM public key for id ${id}: ${JSON.stringify(data)}`);
    return data.data;
  }

  /** Publish the DKIM public key as a DNS TXT record at <selector>._domainkey.<domain>. */
  async publishDns(domain: string, publicKeyB64: string): Promise<void> {
    const zoneId = await this.getZoneId(domain);
    const recordName = `${this.dkimSelector}._domainkey.${domain}`;
    const txt = `v=DKIM1; k=ed25519; p=${publicKeyB64}`;
    await this.dnsProvider.createRecord({ zoneId, type: 'TXT', name: recordName, content: txt, ttl: 3600 });
    this.logger.log(`DKIM TXT record published: ${recordName}`);
  }

  get selector(): string {
    return this.dkimSelector;
  }

  getDnsProvider(): DnsProvider {
    return this.dnsProvider;
  }

  async getZoneId(domain: string): Promise<string> {
    const zoneId = await this.dnsProvider.getZoneId(domain);
    if (!zoneId) throw new Error(`DNS zone for ${domain} not found — is the domain on Cloudflare?`);
    return zoneId;
  }
}
