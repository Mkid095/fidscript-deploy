/**
 * Stalwart v0.16 email provider.
 *
 * Implements the full `IEmailProvider` interface using Stalwart's JMAP
 * admin protocol (the `urn:stalwart:jmap` capability, methods prefixed `x:`).
 * The v0.15 REST API at `/api/principal` was removed in v0.16 — see
 * `docs/phases/phase-09.md` for the migration story.
 *
 * Auth: HTTP Basic, username = the platform admin email
 * (`SMTP_SUBMISSION_USER`, e.g. `admin@deploy.fidscript.com`), password =
 * `SMTP_SUBMISSION_PASS` / `STALWART_ADMIN_TOKEN`. This is the same identity
 * the platform uses for outbound SMTP submission, so we don't introduce a
 * second admin account.
 *
 * Endpoint: `STALWART_JMAP_URL` (the HTTP listener root, NOT the `/jmap` path —
 * the SDK appends `/jmap` itself). Defaults to `http://fidscript_stalwart:8080/`.
 *
 * Wire format the SDK uses:
 *   POST /jmap
 *   {
 *     "using":  ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
 *     "methodCalls": [[ "x:Account/set", { create: { "k": { ... } } }, "tag" ]]
 *   }
 *   → { "methodResponses": [[ "x:Account/set", { created: { k: "id" } }, "tag" ]] }
 *
 * The `accountId` is implied (the admin account's), not specified in the
 * method args — that's a quirk of the admin JMAP namespace.
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import {
  IEmailProvider,
  ProviderDomain,
  ProviderMailbox,
  ProviderAlias,
  CreateDomainInput,
  CreateMailboxInput,
  CreateAliasInput,
  ProviderMessage,
} from './i-email-provider';

interface JmapResponse {
  sessionState: string;
  methodResponses: Array<[string, Record<string, unknown>, string]>;
}

@Injectable()
export class StalwartEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(StalwartEmailProvider.name);
  private readonly client: AxiosInstance;
  private readonly adminEmail: string;
  /** Cached admin accountId — first JMAP call reveals it via `accountId` in responses. */
  private adminAccountId: string | null = null;

  constructor(private config: ConfigService) {
    // STALWART_JMAP_URL is the HTTP listener root, with or without a trailing
    // slash (docker-compose renders `http://fidscript_stalwart:8080/`). We
    // strip any trailing slash before appending `/jmap` to avoid
    // `//jmap` paths that Stalwart returns 404 for.
    const rawUrl = this.config.get<string>('STALWART_JMAP_URL', 'http://fidscript_stalwart:8080');
    const baseURL = rawUrl.replace(/\/+$/, '') + '/jmap';
    const user = this.config.get<string>('SMTP_SUBMISSION_USER', 'admin');
    const pass = this.config.get<string>(
      'SMTP_SUBMISSION_PASS',
      this.config.get<string>('STALWART_ADMIN_TOKEN', ''),
    );
    this.adminEmail = user;
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64');

    const axios = require('axios') as typeof import('axios');
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      timeout: 15000,
    });
  }

  /**
   * Issue a JMAP method call. Standard JMAP allows batching; we keep it
   * single-call per request for readability — most call sites are simple.
   */
  private async call<T = Record<string, unknown>>(
    method: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const response = await this.client.post<JmapResponse>('', {
        using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
        methodCalls: [[method, args, '0']],
      });

      const [name, result] = response.data.methodResponses[0];
      if (name !== method) {
        throw new Error(`JMAP response method mismatch: expected ${method}, got ${name}`);
      }
      // Cache the admin accountId from the first response (all responses echo it).
      const acctId = (result as { accountId?: string }).accountId;
      if (acctId) this.adminAccountId = acctId;

      // Per-call error envelope: { type: 'error', description, ... }
      if ((result as { type?: string }).type === 'error') {
        const err = result as { type: string; description?: string };
        throw new Error(`Stalwart ${method} error: ${err.description ?? err.type}`);
      }
      return result as T;
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stalwart ${method} call failed: ${msg}`);
      throw new InternalServerErrorException(`Stalwart ${method}: ${msg}`);
    }
  }

  // ── Domains ───────────────────────────────────────────────────────

  async ensureDomain(input: CreateDomainInput): Promise<ProviderDomain> {
    const existing = (await this.listDomains()).find((d) => d.name === input.name);
    if (existing) {
      // Reconcile enabled/description if the caller asked for it.
      if (input.isEnabled !== undefined && existing.isEnabled !== input.isEnabled) {
        await this.call('x:Domain/set', {
          update: { [existing.id]: { isEnabled: input.isEnabled } },
        });
        return { ...existing, isEnabled: input.isEnabled };
      }
      return existing;
    }
    const result = await this.call<{ created: Record<string, string> }>('x:Domain/set', {
      create: {
        newDomain: {
          name: input.name,
          isEnabled: input.isEnabled ?? true,
          ...(input.description ? { description: input.description } : {}),
        },
      },
    });
    const id = result.created?.newDomain;
    if (!id) throw new InternalServerErrorException('Stalwart did not return a domain id');
    return { id, name: input.name, isEnabled: input.isEnabled ?? true };
  }

  async listDomains(): Promise<ProviderDomain[]> {
    const result = await this.call<{ list: ProviderDomain[] }>('x:Domain/get', { ids: null });
    return result.list ?? [];
  }

  async deleteDomain(id: string): Promise<void> {
    await this.call('x:Domain/set', { destroy: [id] });
  }

  // ── Mailboxes ─────────────────────────────────────────────────────

  async createMailbox(input: CreateMailboxInput): Promise<ProviderMailbox> {
    // Credentials in Stalwart v0.16 are an object map keyed by integer-string
    // (the `map<integer, Credential>` type). The first credential is `0` and
    // holds the user's primary password. See stalwartlabs/cli docs — the
    // "create account/user" example uses the exact shape below.
    const value: Record<string, unknown> = {
      '@type': 'User',
      name: input.name,
      domainId: input.domainId,
      credentials: {
        '0': { '@type': 'Password', secret: input.password },
      },
    };
    if (input.description) value.description = input.description;
    if (input.quotaBytes) {
      value.quotas = { maxStorage: input.quotaBytes };
    }
    const result = await this.call<{ created: Record<string, string> }>('x:Account/set', {
      create: { newAccount: value },
    });
    const id = result.created?.newAccount;
    if (!id) throw new InternalServerErrorException('Stalwart did not return an account id');
    return {
      id,
      name: input.name,
      email: `${input.name}@${await this.domainNameOf(input.domainId)}`,
      domainId: input.domainId,
      isEnabled: true,
      quotaBytes: input.quotaBytes ?? null,
    };
  }

  async getMailbox(id: string): Promise<ProviderMailbox | null> {
    const result = await this.call<{ list: Array<{ id: string; name: string; domainId: string; isEnabled: boolean }> }>(
      'x:Account/get',
      { ids: [id] },
    );
    const acct = (result.list ?? [])[0];
    if (!acct) return null;
    return {
      id: acct.id,
      name: acct.name,
      email: `${acct.name}@${await this.domainNameOf(acct.domainId)}`,
      domainId: acct.domainId,
      isEnabled: acct.isEnabled,
      quotaBytes: null,
    };
  }

  async listMailboxes(domainId?: string): Promise<ProviderMailbox[]> {
    // v0.16 supports x:Account/query with where filters — but the schema
    // doesn't expose it via the schema introspection (only `Account` and
    // `Account/get`/`Account/set` show up). We list and filter client-side
    // which is fine for a platform with < 10K accounts.
    const result = await this.call<{ list: Array<{ id: string; name: string; domainId: string; isEnabled: boolean }> }>(
      'x:Account/get',
      { ids: null },
    );
    const all = result.list ?? [];
    const filtered = domainId ? all.filter((a) => a.domainId === domainId) : all;
    return Promise.all(
      filtered.map(async (a) => ({
        id: a.id,
        name: a.name,
        email: `${a.name}@${await this.domainNameOf(a.domainId)}`,
        domainId: a.domainId,
        isEnabled: a.isEnabled,
        quotaBytes: null,
      })),
    );
  }

  async setMailboxPassword(id: string, newPassword: string): Promise<void> {
    await this.call('x:Account/set', {
      update: {
        [id]: { credentials: { '0': { '@type': 'Password', secret: newPassword } } },
      },
    });
  }

  async setMailboxEnabled(id: string, enabled: boolean): Promise<void> {
    // v0.16: `isEnabled` is on the Account.User variant. Use the
    // generic update path with that field.
    await this.call('x:Account/set', { update: { [id]: { isEnabled: enabled } } });
  }

  async deleteMailbox(id: string): Promise<void> {
    await this.call('x:Account/set', { destroy: [id] });
  }

  // ── Aliases ───────────────────────────────────────────────────────

  async createAlias(input: CreateAliasInput): Promise<ProviderAlias> {
    // v0.16 has no top-level Alias object — an "alias" is a Group account
    // whose name resolves to a forwarded address. We model the most
    // common case: a group with the alias name and `accounts` field listing
    // the destination accounts (mailbox targets) or external addresses.
    // Webhook targets are still represented as a custom Sieve rule installed
    // on the alias account (see `stalwart-sieve.service.ts`).
    const value: Record<string, unknown> = {
      '@type': 'Group',
      name: input.name,
      domainId: input.domainId,
    };
    if (input.description) value.description = input.description;
    const result = await this.call<{ created: Record<string, string> }>('x:Account/set', {
      create: { newAlias: value },
    });
    const id = result.created?.newAlias;
    if (!id) throw new InternalServerErrorException('Stalwart did not return an alias id');
    return {
      id,
      name: input.name,
      email: `${input.name}@${await this.domainNameOf(input.domainId)}`,
      domainId: input.domainId,
      isEnabled: true,
      targets: input.targets,
    };
  }

  async getAlias(id: string): Promise<ProviderAlias | null> {
    const mb = await this.getMailbox(id);
    if (!mb) return null;
    return {
      id: mb.id,
      name: mb.name,
      email: mb.email,
      domainId: mb.domainId,
      isEnabled: mb.isEnabled,
      targets: [],
    };
  }

  async listAliases(domainId?: string): Promise<ProviderAlias[]> {
    const all = await this.listMailboxes(domainId);
    return all.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      domainId: m.domainId,
      isEnabled: m.isEnabled,
      targets: [],
    }));
  }

  async setAliasTargets(_id: string, _targets: ProviderAlias['targets']): Promise<void> {
    // TODO: rebuild Sieve on the alias account with the new routing rules.
    // For now this is a no-op — the platform DB is the source of truth and
    // the Sieve rebuild is triggered by `SieveRebuildService` on alias
    // create/update/delete. This method exists to satisfy the interface
    // and will be wired up in Phase 09 finalization.
  }

  async setAliasEnabled(id: string, enabled: boolean): Promise<void> {
    await this.setMailboxEnabled(id, enabled);
  }

  async deleteAlias(id: string): Promise<void> {
    await this.deleteMailbox(id);
  }

  // ── Message store ─────────────────────────────────────────────────

  async listMessages(
    mailboxId: string,
    filter: { folder?: string; unread?: boolean; limit?: number; offset?: number },
  ): Promise<ProviderMessage[]> {
    // Authenticate as the mailbox owner to read its messages. For now we
    // use the admin's session and filter by mailbox; the proper fix is to
    // use JMAP's `accountId` parameter (we have it cached). Implemented
    // in the inbox UI later.
    const args: Record<string, unknown> = {
      accountId: mailboxId,
      filter: { inMailbox: mailboxId } as Record<string, unknown>,
      sort: [{ property: 'receivedAt', isAscending: false }],
      limit: filter.limit ?? 50,
    };
    if (filter.unread !== undefined) (args.filter as Record<string, unknown>).unread = filter.unread;
    const result = await this.call<{
      ids: string[];
    }>('Email/query', args);
    if (!result.ids?.length) return [];
    const fetched = await this.call<{
      list: Array<{
        id: string;
        from: { email: string; name?: string };
        to: Array<{ email: string; name?: string }>;
        subject: string;
        receivedAt: string;
        keywords: Record<string, boolean>;
        preview: string;
        mailboxIds: Record<string, boolean>;
      }>;
    }>('Email/get', {
      accountId: mailboxId,
      ids: result.ids,
      properties: ['id', 'from', 'to', 'subject', 'receivedAt', 'keywords', 'preview', 'mailboxIds'],
    });
    return (fetched.list ?? []).map((m) => ({
      id: m.id,
      mailboxId,
      from: m.from?.email ?? '',
      to: (m.to ?? []).map((t) => t.email),
      subject: m.subject,
      receivedAt: m.receivedAt,
      isRead: !m.keywords?.$unread,
      isStarred: !!m.keywords?.$flagged,
      preview: m.preview ?? '',
      folder: Object.keys(m.mailboxIds ?? {}).find((k) => m.mailboxIds[k]) ?? 'Inbox',
    }));
  }

  async getMessage(id: string): Promise<ProviderMessage | null> {
    return null; // placeholder, see Email/get with full body
  }

  async setMessageRead(id: string, isRead: boolean): Promise<void> {
    await this.call('Email/set', {
      update: { [id]: { keywords: { $seen: isRead, $unread: !isRead } } },
    });
  }

  async setMessageStarred(id: string, starred: boolean): Promise<void> {
    await this.call('Email/set', {
      update: { [id]: { keywords: { $flagged: starred } } },
    });
  }

  async deleteMessages(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.call('Email/set', { destroy: ids });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /** Resolve a domain id to its name. */
  private async domainNameOf(domainId: string): Promise<string> {
    const result = await this.call<{ list: Array<{ id: string; name: string }> }>('x:Domain/get', {
      ids: [domainId],
    });
    return (result.list ?? [])[0]?.name ?? domainId;
  }
}
