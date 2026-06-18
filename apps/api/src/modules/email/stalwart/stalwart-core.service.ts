/**
 * Stalwart JMAP core: HTTP client + raw method call executor.
 *
 * Compatible with Stalwart v0.15.5.
 *
 * Auth: HTTP Basic using the platform admin token (STALWART_ADMIN_TOKEN).
 * The token is the same bcrypt-hashed secret in Stalwart's config.toml;
 * the plaintext is in secrets/stalwart_admin_token.txt.
 *
 * JMAP endpoint: POST http://fidscript_stalwart:8080/jmap/
 * (the trailing slash is required by Stalwart v0.15)
 *
 * v0.15.5 capabilities confirmed working:
 *   - urn:ietf:params:jmap:core      (Core/echo, Core/get)
 *   - urn:ietf:params:jmap:mail     (Mailbox/get, Email/query, Identity/*)
 *   - urn:ietf:params:jmap:sieve     (SieveScript/get/set)
 *   - urn:ietf:params:jmap:principals (Principal/get, Principal/query)
 *
 * NOT available in v0.15.5 (added in v0.16):
 *   - urn:stalwart:jmap  (Stalwart extensions)
 *   - x:Domain/set, x:Domain/get  (domain management)
 *   - x:Account/set, x:Account/get  (account/mailbox management)
 *
 * Stalwart docs: https://stalw.art/docs/management/
 * JMAP spec:     https://jmap.io/
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';

export interface JmapResponse {
  sessionState: string;
  methodResponses: Array<[string, Record<string, unknown>, string]>;
}

@Injectable()
export class StalwartJmapService {
  private readonly logger = new Logger(StalwartJmapService.name);
  protected readonly client: AxiosInstance;
  protected readonly accountId = 'd333333'; // fallback admin account ID (truncated from 'admin')

  constructor(protected configService: ConfigService) {
    // Stalwart v0.15.5 uses HTTP Basic auth, NOT Bearer token.
    // The admin token is shared with Stalwart via STALWART_ADMIN_TOKEN_FILE.
    const baseURL =
      this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080') + '/jmap';
    const adminToken = this.configService.get('STALWART_ADMIN_TOKEN', '');
    const credentials = Buffer.from('admin:' + adminToken).toString('base64');

    this.client = this.makeClient(baseURL, credentials);
  }

  protected makeClient(baseURL: string, credentials: string): AxiosInstance {
    // Lazily import axios to avoid pulling it in at module load time
    const axios = require('axios') as typeof import('axios');
    return axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        // v0.15.5 uses HTTP Basic auth — NOT Bearer token
        Authorization: `Basic ${credentials}`,
      },
      timeout: 15000,
    });
  }

  /**
   * Execute one or more JMAP method calls in a single request.
   *
   * Uses only standard JMAP capabilities confirmed available in v0.15.5:
   *   - urn:ietf:params:jmap:core
   *   - urn:ietf:params:jmap:mail
   *   - urn:ietf:params:jmap:sieve
   *   - urn:ietf:params:jmap:principals
   */
  async jmapCall(
    methodCalls: Array<[string, Record<string, unknown>]>,
    using?: string[],
  ): Promise<JmapResponse> {
    const capabilities = using ?? [
      'urn:ietf:params:jmap:core',
      'urn:ietf:params:jmap:mail',
      'urn:ietf:params:jmap:sieve',
      'urn:ietf:params:jmap:principals',
    ];

    const payload = {
      using: capabilities,
      methodCalls: methodCalls.map((mc, i) => [...mc, String(i)]),
    };

    try {
      const response = await this.client.post<JmapResponse>('', payload);
      const methodResponses = response.data.methodResponses;

      for (const [methodName, result] of methodResponses) {
        if (
          methodName.endsWith('/error') ||
          (result && (result as Record<string, unknown>).type === 'error')
        ) {
          const error = result as { type: string; description?: string };
          throw new InternalServerErrorException(
            `Stalwart JMAP error in ${methodName}: ${error.description ?? JSON.stringify(error)}`,
          );
        }
      }

      return response.data;
    } catch (err: unknown) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stalwart JMAP call failed: ${msg}`);
      throw new InternalServerErrorException(`Stalwart JMAP call failed: ${msg}`);
    }
  }

  // ── Domain operations ────────────────────────────────────────────
  // NOTE: x:Domain/set and x:Domain/get do NOT exist in Stalwart v0.15.5.
  // They were added in v0.16. Domain management in v0.15 is done via the
  // webadmin UI or the internal directory — there is no JMAP equivalent.
  // For Phase 09, domain ownership is tracked in the platform database
  // (EmailDomain model) and verified via DNS. Stalwart itself does not
  // need to be told about domains — it accepts mail for any domain that
  // DNS routes to it.

  async createDomain(domain: string): Promise<{ id: string; name: string }> {
    // Domains are a platform concept, not a Stalwart v0.15 concept.
    // Stalwart accepts mail for any domain pointed at it via MX records.
    // Return a synthetic ID derived from the domain name.
    this.logger.warn(`createDomain called but Stalwart v0.15 has no Domain/set — using domain name as ID`);
    return { id: domain, name: domain };
  }

  async deleteDomain(stalwartDomainId: string): Promise<void> {
    // No-op for v0.15. No domain delete JMAP method exists.
    this.logger.warn(`deleteDomain called but Stalwart v0.15 has no Domain/set — no-op`);
  }

  async listDomains(): Promise<Array<{ id: string; name: string }>> {
    // In v0.15, domains are not a JMAP object. Stalwart accepts mail for
    // any domain pointed at it. Return empty — domains are tracked in the DB.
    return [];
  }
}
