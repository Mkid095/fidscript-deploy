/**
 * The administrative operations, over Stalwart's `x:` JMAP management
 * methods (the v0.16 surface — the old REST admin API is gone).
 *
 * Every function here is a server-side call with the admin credential.
 * Nothing in this file is reachable from the browser directly; the API
 * routes that use it are auth-guarded.
 */
import {
  StalwartError,
  adminClient,
  resolveAccountId,
  userClient,
} from '@/lib/stalwart/jmap';

export interface DomainInfo {
  id: string;
  name: string;
  isEnabled: boolean;
  dkimSelectors: string[];
  hasDnsZone: boolean;
}

export interface AccountInfo {
  id: string;
  name: string;
  /** The full address: name@domain. */
  email: string;
  domainId: string;
  isEnabled: boolean;
  quotaBytes: number | null;
}

interface StalwartDomainRow {
  id: string;
  name: string;
  isEnabled: boolean;
  dnsZoneFile: string | null;
  dkimManagement: {
    selectorTemplate?: string;
    rotateAfter?: number;
  } | null;
}

interface StalwartAccountRow {
  id: string;
  name: string;
  domainId: string;
  isEnabled: boolean;
  quotas: { maxStorage?: number } | null;
}

function domainNameCache(): Map<string, string> {
  return new Map();
}

function createdId(
  created: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const raw = created?.[key];
  if (typeof raw === 'string') return raw;
  // Stalwart's `x:` set can answer the created map with the object itself;
  // normalise both shapes.
  if (raw && typeof raw === 'object' && 'id' in raw) return String((raw as { id: unknown }).id);
  return null;
}

export class Admin {
  private readonly client = adminClient();
  private domains: Map<string, string> | null = null;

  private async domainNames(): Promise<Map<string, string>> {
    if (this.domains) return this.domains;
    const result = await this.client.one<{ list: StalwartDomainRow[] }>(
      'x:Domain/get',
      { ids: null, properties: ['id', 'name'] },
    );
    this.domains = new Map(
      (result.list ?? []).map((d) => [d.id, d.name]),
    );
    return this.domains;
  }

  async listDomains(): Promise<DomainInfo[]> {
    const result = await this.client.one<{ list: StalwartDomainRow[] }>(
      'x:Domain/get',
      { ids: null, properties: ['id', 'name', 'isEnabled', 'dnsZoneFile', 'dkimManagement'] },
    );
    // The DKIM selector names come from the domain's automatic DKIM policy
    // (its selector template); the zone file is surfaced so the UI can show
    // the exact records to publish.
    return (result.list ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      isEnabled: row.isEnabled,
      dkimSelectors: row.dkimManagement?.selectorTemplate
        ? [row.dkimManagement.selectorTemplate]
        : [],
      hasDnsZone: Boolean(row.dnsZoneFile),
    }));
  }

  async getDomain(name: string): Promise<StalwartDomainRow | null> {
    const result = await this.client.one<{ list: StalwartDomainRow[] }>(
      'x:Domain/get',
      { ids: null, properties: ['id', 'name', 'isEnabled', 'dnsZoneFile', 'dkimManagement', 'certificateManagement'] },
    );
    return (result.list ?? []).find((d) => d.name === name) ?? null;
  }

  async ensureDomain(name: string): Promise<string> {
    const names = await this.domainNames();
    const existing = [...names.entries()].find(([, n]) => n === name)?.[0];
    if (existing) return existing;
    const result = await this.client.one<{ created: Record<string, unknown> }>(
      'x:Domain/set',
      { create: { newDomain: { name, isEnabled: true } } },
    );
    const id = createdId(result.created, 'newDomain');
    if (!id) throw new StalwartError('x:Domain/set', 'no-id', 'no domain id returned');
    this.domains = null;
    return id;
  }

  async listAccounts(): Promise<AccountInfo[]> {
    const names = await this.domainNames();
    const result = await this.client.one<{ list: StalwartAccountRow[] }>(
      'x:Account/get',
      { ids: null, properties: ['id', 'name', 'domainId', 'isEnabled', 'quotas'] },
    );
    return (result.list ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: `${row.name}@${names.get(row.domainId) ?? row.domainId}`,
      domainId: row.domainId,
      isEnabled: row.isEnabled,
      quotaBytes: row.quotas?.maxStorage ?? null,
    }));
  }

  async createAccount(input: {
    name: string;
    domain: string;
    password: string;
    description?: string;
    quotaMb?: number;
  }): Promise<AccountInfo> {
    const domainId = await this.ensureDomain(input.domain);
    const value: Record<string, unknown> = {
      '@type': 'User',
      name: input.name,
      domainId,
      // v0.16 credential shape: a map keyed by integer-string, key "0" is
      // the primary password credential.
      credentials: { 0: { '@type': 'Password', secret: input.password } },
    };
    if (input.description) value.description = input.description;
    if (input.quotaMb) value.quotas = { maxStorage: input.quotaMb * 1024 * 1024 };
    const result = await this.client.one<{ created: Record<string, unknown> }>(
      'x:Account/set',
      { create: { newAccount: value } },
    );
    const id = createdId(result.created, 'newAccount');
    if (!id) throw new StalwartError('x:Account/set', 'no-id', 'no account id returned');
    this.domains = null;
    return {
      id,
      name: input.name,
      email: `${input.name}@${input.domain}`,
      domainId,
      isEnabled: true,
      quotaBytes: input.quotaMb ? input.quotaMb * 1024 * 1024 : null,
    };
  }

  async setAccountPassword(id: string, password: string): Promise<void> {
    await this.client.one(
      'x:Account/set',
      {
        update: { [id]: { credentials: { 0: { '@type': 'Password', secret: password } } } },
      },
    );
  }

  async setAccountEnabled(id: string, enabled: boolean): Promise<void> {
    await this.client.one('x:Account/set', { update: { [id]: { isEnabled: enabled } } });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.client.one('x:Account/set', { destroy: [id] });
  }

  /**
   * An "alias" in this Stalwart build is a Group account: an address with
   * no mailbox of its own that resolves to its member accounts.
   */
  async listAliases(): Promise<AccountInfo[]> {
    const names = await this.domainNames();
    const result = await this.client.one<{
      list: Array<StalwartAccountRow & { type?: string }>;
    }>('x:Account/get', {
      ids: null,
      properties: ['id', 'name', 'domainId', 'isEnabled', 'quotas', 'type'],
    });
    const rows = (result.list ?? []).filter((row) => row.type === 'Group');
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: `${row.name}@${names.get(row.domainId) ?? row.domainId}`,
      domainId: row.domainId,
      isEnabled: row.isEnabled,
      quotaBytes: null,
    }));
  }

  async createAlias(input: {
    name: string;
    domain: string;
    description?: string;
  }): Promise<AccountInfo> {
    const domainId = await this.ensureDomain(input.domain);
    const value: Record<string, unknown> = {
      '@type': 'Group',
      name: input.name,
      domainId,
    };
    if (input.description) value.description = input.description;
    const result = await this.client.one<{ created: Record<string, unknown> }>(
      'x:Account/set',
      { create: { newAlias: value } },
    );
    const id = createdId(result.created, 'newAlias');
    if (!id) throw new StalwartError('x:Account/set', 'no-id', 'no alias id returned');
    this.domains = null;
    return {
      id,
      name: input.name,
      email: `${input.name}@${input.domain}`,
      domainId,
      isEnabled: true,
      quotaBytes: null,
    };
  }

  /**
   * Prove a mailbox credential works, as that user, reading its own
   * identities. This is the sign-in check: Stalwart authoritatively says
   * the mailbox exists, is enabled, and the password is right.
   */
  async verifyMailboxUser(email: string, password: string): Promise<boolean> {
    try {
      const client = userClient(email, password);
      const accountId = await resolveAccountId(client, email, password);
      await client.one('Identity/get', { accountId, ids: null });
      return true;
    } catch {
      return false;
    }
  }
}

export const admin = new Admin();
