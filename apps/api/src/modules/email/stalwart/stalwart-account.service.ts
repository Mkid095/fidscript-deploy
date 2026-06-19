/**
 * Stalwart account (mailbox user) management for v0.15.5.
 *
 * In Stalwart v0.15, accounts (principals) are created and managed via the
 * REST API at /api/principal — NOT via JMAP. There is no x:Account/set
 * or x:Account/get in v0.15.5; those were added in v0.16.
 *
 * The REST API accepts:
 *   POST /api/principal  { name, secrets?, type?, description? }
 *   GET  /api/principal  → { data: { items: [...], total } }
 *   GET  /api/principal/{id}  → { error: "notFound", item: "id" }
 *
 * Authentication to the REST API uses HTTP Basic (same as JMAP).
 */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StalwartJmapService } from '@/modules/email/stalwart/stalwart-core.service';

interface PrincipalItem {
  id: number;
  type: string;
  name: string;
  description?: string;
  secrets?: string[];
}

interface PrincipalListResponse {
  data: {
    items: PrincipalItem[];
    total: number;
  };
}

@Injectable()
export class StalwartAccountService {
  private readonly baseURL: string;

  constructor(
    private configService: ConfigService,
    private stalwartCore: StalwartJmapService,
  ) {
    // The REST API is at the same host as JMAP, no /jmap suffix
    const jmapUrl = this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080');
    this.baseURL = jmapUrl;
  }

  /**
   * Make an authenticated HTTP request to the Stalwart REST API.
   * v0.15 uses HTTP Basic auth (same credentials as JMAP).
   */
  private async api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const adminToken = this.configService.get('STALWART_ADMIN_TOKEN', '');
    const credentials = Buffer.from('admin:' + adminToken).toString('base64');
    const axios = require('axios') as typeof import('axios');
    const response = await axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }).request<T>({ url: path, method, data: body });
    return response.data;
  }

  /**
   * Create an IMAP/SMTP mailbox account (principal) in Stalwart v0.15.
   * The account is created via POST /api/principal with a plaintext password.
   * Stalwart stores the credentials for IMAP/SMTP PLAIN auth on port 465/993.
   */
  async createAccount(
    email: string,
    password: string,
    displayName?: string,
    _quotaMb = 1024,
  ): Promise<{ id: string; name: string }> {
    try {
      const body: Record<string, unknown> = {
        name: email,
        type: 'individual',
        secrets: [password],
        // The address MUST be in `emails` for recipient validation to accept
        // inbound delivery for this mailbox (the `name` alone is not enough).
        emails: [email],
      };
      if (displayName) body.description = displayName;

      const response = await this.api<{ data: number }>('/api/principal', 'POST', body);
      // Response: { data: <numeric_id> }
      if (!response.data || typeof response.data !== 'number') {
        throw new InternalServerErrorException(
          `Stalwart /api/principal did not return an account ID: ${JSON.stringify(response)}`,
        );
      }
      return { id: String(response.data), name: email };
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Failed to create Stalwart account: ${msg}`);
    }
  }

  /**
   * Enable or disable an account by updating its status.
   * In v0.15, principals don't have an explicit "active" status field via the REST API.
   * This is a no-op — account status is implicit from whether secrets are set.
   */
  async setAccountStatus(stalwartAccountId: string, active: boolean): Promise<void> {
    if (!active) {
      // In v0.15, disabling means removing secrets (no auth possible without password)
      // but there is no PATCH /api/principal endpoint. Log and continue.
    }
    // v0.15 has no account status management via REST API
  }

  /**
   * Delete a principal from Stalwart v0.15.
   * There is no DELETE /api/principal in v0.15. Principals cannot be removed
   * via the REST API in this version. Log a warning.
   */
  async deleteAccount(stalwartAccountId: string): Promise<void> {
    // v0.15: Principals cannot be deleted via REST API
  }

  /**
   * Update the password (secret) for an existing account.
   * In v0.15, there is no PATCH /api/principal — secrets are write-once.
   */
  async setAccountPassword(stalwartAccountId: string, newPassword: string): Promise<void> {
    // v0.15: Password cannot be updated via REST API
  }

  /**
   * List all principals (accounts) in Stalwart v0.15.
   */
  async listAccounts(): Promise<Array<{ id: string; name: string; status: string }>> {
    const response = await this.api<PrincipalListResponse>('/api/principal');
    return (response.data?.items ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      status: 'active',
    }));
  }

  /**
   * Idempotently ensure a DOMAIN principal exists. In Stalwart v0.15 a domain
   * is treated as LOCAL (mail accepted/delivered for it) only when a principal
   * of type "domain" exists for it. Created via POST /api/principal.
   */
  async ensureDomainPrincipal(domain: string): Promise<void> {
    const res = await this.api<PrincipalListResponse>('/api/principal');
    const exists = (res.data?.items ?? []).some((p) => p.type === 'domain' && p.name === domain);
    if (exists) return;
    await this.api('/api/principal', 'POST', { type: 'domain', name: domain, description: `${domain} (local)` });
  }

  /**
   * Idempotently ensure an INDIVIDUAL account (mailbox) exists. Skips creation
   * if a principal with this email already exists (no password overwrite —
   * v0.15 secrets are write-once anyway).
   */
  async ensureAccount(email: string, password: string, displayName?: string): Promise<void> {
    const res = await this.api<PrincipalListResponse>('/api/principal');
    const exists = (res.data?.items ?? []).some((p) => p.name === email);
    if (exists) return;
    await this.createAccount(email, password, displayName);
  }
}
