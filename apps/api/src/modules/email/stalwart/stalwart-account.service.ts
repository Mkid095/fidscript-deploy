/**
 * Stalwart account (mailbox user) management — v0.16 only.
 *
 * In Stalwart v0.15 the principal REST API at `/api/principal` was the only
 * way to manage accounts. That endpoint was removed in v0.16 — accounts are
 * now created/managed exclusively via JMAP admin methods
 * (`x:Account/set`, `x:AccountPassword/set`, etc.) under the
 * `urn:stalwart:jmap` capability.
 *
 * This service is now a thin, backward-compatible wrapper around
 * `IEmailProvider` so existing call sites (`mailbox.service`,
 * `mailbox-cleanup.service`, `domain-cleanup.service`, `stalwart-jmap.service`)
 * keep working while the heavy lifting is done by `StalwartEmailProvider`.
 *
 * v0.16 credential format: `credentials` is an object map keyed by
 * integer-string (a `map<integer, Credential>` type), not a list. The
 * primary password lives at key `0` with `@type: "Password"`. See
 * https://stalw.art/docs/management/cli/create#multi-variant-objects.
 */
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { EMAIL_PROVIDER, IEmailProvider } from '@/modules/email/providers/i-email-provider';

@Injectable()
export class StalwartAccountService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly email: IEmailProvider) {}

  /**
   * Create an IMAP/SMTP mailbox account in Stalwart v0.16.
   *
   * The password is stored by the provider (currently Stalwart's internal
   * directory, bcrypt-hashed). For v0.16 the returned id is the JMAP
   * account id (e.g. "d" — a short opaque string assigned by the server).
   */
  async createAccount(
    email: string,
    password: string,
    displayName?: string,
    quotaMb = 1024,
  ): Promise<{ id: string; name: string }> {
    const [localPart, domain] = email.split('@', 2);
    if (!localPart || !domain) {
      throw new InternalServerErrorException(`Invalid email address: ${email}`);
    }
    const d = await this.email.ensureDomain({ name: domain, isEnabled: true });
    const m = await this.email.createMailbox({
      name: localPart,
      domainId: d.id,
      description: displayName,
      password,
      quotaBytes: quotaMb * 1024 * 1024,
    });
    return { id: m.id, name: email };
  }

  /**
   * Enable or disable an account by updating its `isEnabled` flag.
   * v0.16 supports this directly on `x:Account/set` (no separate
   * "suspend" concept; the operator just toggles the flag and the
   * SMTP/IMAP/JMAP services all check it before authenticating).
   */
  async setAccountStatus(stalwartAccountId: string, active: boolean): Promise<void> {
    await this.email.setMailboxEnabled(stalwartAccountId, active);
  }

  /**
   * Remove a principal/account from Stalwart. v0.16 supports
   * `x:Account/set` with `destroy: [id]`, which the provider implements
   * for both individual and group accounts.
   */
  async deleteAccount(stalwartAccountId: string): Promise<void> {
    await this.email.deleteMailbox(stalwartAccountId);
  }

  /**
   * Update the password (secret) for an existing account.
   * v0.16: `x:Account/set` with `update.<id>.credentials.0.secret`.
   */
  async setAccountPassword(stalwartAccountId: string, newPassword: string): Promise<void> {
    await this.email.setMailboxPassword(stalwartAccountId, newPassword);
  }

  /**
   * List all mailboxes in Stalwart. The provider filters by domain id
   * server-side when given; this convenience wrapper does not.
   */
  async listAccounts(): Promise<Array<{ id: string; name: string; status: string }>> {
    const all = await this.email.listMailboxes();
    return all.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.isEnabled ? 'active' : 'disabled',
    }));
  }

  /**
   * Idempotently ensure a DOMAIN exists in Stalwart.
   * v0.16: `x:Domain/set` create-or-update.
   */
  async ensureDomainPrincipal(domain: string): Promise<void> {
    await this.email.ensureDomain({ name: domain, isEnabled: true });
  }

  /**
   * Idempotently ensure a mailbox exists.
   * Used by the system-mailbox bootstrap path; safe to call repeatedly.
   */
  async ensureAccount(email: string, password: string, displayName?: string): Promise<void> {
    const all = await this.email.listMailboxes();
    const matches = await Promise.all(
      all.map(async (m) => ({
        m,
        full: `${m.name}@${await this.domainName(m.domainId)}`,
      })),
    );
    if (matches.some((x) => x.full === email)) return;
    await this.createAccount(email, password, displayName);
  }

  private async domainName(domainId: string): Promise<string> {
    const list = await this.email.listDomains();
    return list.find((d) => d.id === domainId)?.name ?? domainId;
  }
}
