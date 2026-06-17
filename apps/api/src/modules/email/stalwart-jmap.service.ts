/**
 * Stalwart JMAP Management API client.
 *
 * All management operations go through POST /jmap with bearer auth.
 * Uses the x: prefix for admin/object methods (Domain/set, Account/set).
 *
 * Stalwart docs: https://stalw.art/docs/management/
 * JMAP spec:     https://jmap.io/
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface JmapResponse {
  sessionState: string;
  methodResponses: Array<[string, Record<string, unknown>, string]>;
}

@Injectable()
export class StalwartJmapService {
  private readonly logger = new Logger(StalwartJmapService.name);
  private readonly client: AxiosInstance;
  private readonly adminToken: string;

  constructor(private configService: ConfigService) {
    const baseURL =
      this.configService.get('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080') + '/jmap';
    this.adminToken = this.configService.get('STALWART_ADMIN_TOKEN', '');

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.adminToken}`,
      },
      timeout: 15000,
    });
  }

  /**
   * Execute one or more JMAP method calls in a single request.
   * Uses the admin bearer token for all calls.
   */
  async jmapCall(methodCalls: Array<[string, Record<string, unknown>]>): Promise<JmapResponse> {
    const payload = {
      using: [
        'urn:ietf:params:jmap:core',
        'urn:ietf:params:jmap:mail',
        'urn:stalwart:jmap',
      ],
      methodCalls: methodCalls.map((mc, i) => [...mc, String(i)]),
    };

    try {
      const response = await this.client.post<JmapResponse>('', payload);
      const methodResponses = response.data.methodResponses;

      // Surface any error responses as exceptions
      for (const [methodName, result, _id] of methodResponses) {
        if (methodName.endsWith('/error') || (result && (result as Record<string, unknown>).type === 'error')) {
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

  // ============================================================
  // Domains
  // ============================================================

  /**
   * Create a domain in Stalwart.
   * @returns The created domain object with its id
   */
  async createDomain(domain: string): Promise<{ id: string; name: string }> {
    const res = await this.jmapCall([
      [
        'x:Domain/set',
        {
          create: {
            d1: { name: domain },
          },
        },
      ],
    ]);

    const created = res.methodResponses[0][1] as { created?: Record<string, { id: string; name: string }> };
    const domainData = created?.created?.d1;
    if (!domainData) throw new InternalServerErrorException('Stalwart did not return domain id');
    return domainData;
  }

  /**
   * Delete a domain from Stalwart by its Stalwart-assigned id.
   */
  async deleteDomain(stalwartDomainId: string): Promise<void> {
    await this.jmapCall([
      [
        'x:Domain/set',
        {
          destroy: [stalwartDomainId],
        },
      ],
    ]);
  }

  /**
   * List all domains in Stalwart.
   */
  async listDomains(): Promise<Array<{ id: string; name: string }>> {
    const res = await this.jmapCall([['x:Domain/get', {}]]);
    const data = res.methodResponses[0][1] as { list?: Array<{ id: string; name: string }> };
    return data?.list ?? [];
  }

  // ============================================================
  // Accounts (mailboxes) — each account = one mailbox user
  // ============================================================

  /**
   * Create a mail account (mailbox) in Stalwart.
   * @param email  Full email address, e.g. "john@example.com"
   * @param password Plain-text password — Stalwart hashes with Argon2 internally
   * @param displayName Optional display name
   * @param quotaMb Optional quota in MB (default 1024)
   */
  async createAccount(
    email: string,
    password: string,
    displayName?: string,
    quotaMb = 1024,
  ): Promise<{ id: string; name: string }> {
    const res = await this.jmapCall([
      [
        'x:Account/set',
        {
          create: {
            a1: {
              name: email,
              ...(displayName ? { description: displayName } : {}),
              quota: { value: quotaMb, mode: 'soft' },
              secrets: [{ type: 'password', value: password }],
              status: 'active',
            },
          },
        },
      ],
    ]);

    const created = res.methodResponses[0][1] as { created?: Record<string, { id: string; name: string }> };
    const accountData = created?.created?.a1;
    if (!accountData) throw new InternalServerErrorException('Stalwart did not return account id');
    return accountData;
  }

  /**
   * Update account (mailbox) status: active / disabled.
   * Stalwart account ids are the ones stored in EmailMailbox.stalwartAccountId.
   */
  async setAccountStatus(stalwartAccountId: string, active: boolean): Promise<void> {
    await this.jmapCall([
      [
        'x:Account/set',
        {
          update: {
            [stalwartAccountId]: {
              status: active ? 'active' : 'disabled',
            },
          },
        },
      ],
    ]);
  }

  /**
   * Delete a mail account from Stalwart.
   */
  async deleteAccount(stalwartAccountId: string): Promise<void> {
    await this.jmapCall([
      [
        'x:Account/set',
        {
          destroy: [stalwartAccountId],
        },
      ],
    ]);
  }

  /**
   * Change a mailbox password.
   */
  async setAccountPassword(stalwartAccountId: string, newPassword: string): Promise<void> {
    await this.jmapCall([
      [
        'x:Account/set',
        {
          update: {
            [stalwartAccountId]: {
              secrets: [{ type: 'password', value: newPassword }],
            },
          },
        },
      ],
    ]);
  }

  /**
   * List all accounts in Stalwart.
   */
  async listAccounts(): Promise<Array<{ id: string; name: string; status: string }>> {
    const res = await this.jmapCall([['x:Account/get', {}]]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ id: string; name: string; status: string }>;
    };
    return data?.list ?? [];
  }

  // ============================================================
  // Sender Identities (JmapIdentity)
  // ============================================================

  /**
   * Create a sender identity (From address) for an account.
   * These are per-account, associated with the Stalwart account id.
   */
  async createIdentity(
    stalwartAccountId: string,
    email: string,
    name?: string,
  ): Promise<{ id: string; name?: string }> {
    const res = await this.jmapCall([
      [
        'jmapIdentityCreate',
        {
          accountId: stalwartAccountId,
          creates: {
            i1: {
              email,
              ...(name ? { realName: name } : {}),
              repliedTo: null,
              bcc: null,
            },
          },
        },
      ],
    ]);

    const created = res.methodResponses[0][1] as { created?: Record<string, { id: string }> };
    const idData = created?.created?.i1;
    if (!idData) throw new InternalServerErrorException('Stalwart did not return identity id');
    return { id: idData.id, name };
  }

  /**
   * Delete a sender identity.
   */
  async deleteIdentity(stalwartAccountId: string, identityId: string): Promise<void> {
    await this.jmapCall([
      [
        'jmapIdentityDestroy',
        {
          accountId: stalwartAccountId,
          destroy: [identityId],
        },
      ],
    ]);
  }

  /**
   * List identities for an account.
   */
  async listIdentities(
    stalwartAccountId: string,
  ): Promise<Array<{ id: string; email: string; realName?: string }>> {
    const res = await this.jmapCall([
      ['jmapIdentityGet', { accountId: stalwartAccountId, ids: null }],
    ]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ id: string; email: string; realName?: string }>;
    };
    return data?.list ?? [];
  }

  // ============================================================
  // Sieve scripts (catch-all, forwarding rules)
  // ============================================================

  /**
   * Get the active Sieve script for an account.
   */
  async getSieveScript(stalwartAccountId: string): Promise<{ script: string; name: string } | null> {
    const res = await this.jmapCall([
      ['jmapSieveScriptQuery', { accountId: stalwartAccountId }],
    ]);
    const data = res.methodResponses[0][1] as {
      list?: Array<{ name: string; script: string }>;
    };
    return data?.list?.[0] ?? null;
  }

  /**
   * Store and activate a Sieve script for an account.
   * This handles catch-all forwarding rules.
   */
  async setSieveScript(stalwartAccountId: string, script: string, name = 'active'): Promise<void> {
    await this.jmapCall([
      [
        'jmapSieveScriptSet',
        {
          accountId: stalwartAccountId,
          ifInState: null,
          create: {
            s1: { name, script },
          },
          destroyNames: [],
          onSuccessUpdateScript: { s1: name },
        },
      ],
    ]);
  }

  /**
   * Delete a Sieve script by name.
   */
  async deleteSieveScript(stalwartAccountId: string, scriptName: string): Promise<void> {
    await this.jmapCall([
      [
        'jmapSieveScriptSet',
        {
          accountId: stalwartAccountId,
          ifInState: null,
          create: {},
          destroyNames: [scriptName],
          onSuccessUpdateScript: null,
        },
      ],
    ]);
  }
}
