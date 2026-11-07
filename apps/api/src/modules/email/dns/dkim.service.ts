import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { basicAuthHeader } from '@/common/basic-auth';

/**
 * DKIM key management — Stalwart side only.
 *
 * The DKIM private key lives in Stalwart's internal RocksDB store (it
 * never leaves Stalwart). This service:
 *   1. Creates the key in Stalwart (idempotent — `fieldAlreadyExists` is OK).
 *   2. Reads the public key back so another service (`MailDnsService`)
 *      can publish it as a TXT record in the per-project Cloudflare zone.
 *
 * Per the Infrastructure-first architecture:
 *   - Stalwart admin token: read from `process.env.STALWART_ADMIN_TOKEN`
 *     (platform-level secret). The DKIM key store is platform-wide.
 *   - DNS publishing: lives in `MailDnsService.setupEmailDns` because it
 *     needs the per-project `CloudflareDnsProvider`. Keeping that out of
 *     this service avoids the temptation to call the platform's Cloudflare
 *     token by mistake.
 *
 * Selector: `default` (Stalwart's default DKIM selector). Ed25519 only
 * for now; RSA keys would be a separate Stalwart key id with a different
 * selector (e.g. `v1-rsa`) — added when an RSA key is needed.
 */
@Injectable()
export class DkimService {
  private readonly logger = new Logger(DkimService.name);
  private readonly dkimSelector = 'default';
  private readonly baseURL: string;
  private readonly adminToken: string;

  constructor(private configService: ConfigService) {
    this.baseURL = this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080');
    // Platform-level secret. If missing, every DKIM call will throw —
    // better than silent failure.
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

  get selector(): string {
    return this.dkimSelector;
  }
}

