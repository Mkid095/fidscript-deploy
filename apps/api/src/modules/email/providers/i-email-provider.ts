/**
 * Email Provider — full mail-server management interface.
 *
 * Distinct from `email-provider.interface.ts` (the *sender* interface, which only
 * knows how to submit outbound messages). The provider here owns the full
 * lifecycle of mail-server state: domains, mailboxes, aliases, credentials,
 * and message-store operations. Every method has a single implementation per
 * backend (Stalwart now; Microsoft 365, Google Workspace, or Postmark later)
 * so the rest of the platform can stay backend-agnostic.
 *
 * Why this lives in its own interface (and not on `EmailService`):
 *   - The platform has two kinds of "email" — system mail (magic codes,
 *     platform notifications) and tenant mail (user mailboxes per project).
 *     Both flow through the same provider.
 *   - The provider is called from many places (mailbox service, alias
 *     service, identity service, message service, platform-mail service).
 *     Centralising the contract here keeps the rest of the code path-shaped.
 *   - The same provider is the source of truth for "is this account active?"
 *     / "does this alias route to a valid mailbox?" — the platform DB stores
 *     the metadata, the provider is consulted for the live state.
 *
 * Method philosophy: every method is idempotent where the operation allows
 * (re-creating a domain that already exists is a no-op, not an error). The
 * caller is responsible for translating provider errors into HTTP status.
 */

export interface ProviderDomain {
  /** Provider-internal id (the row's @id). */
  id: string;
  name: string;
  isEnabled: boolean;
}

export interface ProviderMailbox {
  id: string;
  /** local-part (the part before the @). */
  name: string;
  /** Fully-qualified email address (derived from name + domain). */
  email: string;
  domainId: string;
  isEnabled: boolean;
  /** Quota in bytes, or null if unbounded. */
  quotaBytes: number | null;
}

export interface ProviderAlias {
  id: string;
  name: string;
  email: string;
  domainId: string;
  isEnabled: boolean;
  /** Where mail to this alias gets forwarded. */
  targets: Array<
    | { type: 'mailbox'; mailboxId: string }
    | { type: 'external'; address: string }
    | { type: 'webhook'; url: string }
  >;
}

export interface CreateDomainInput {
  name: string;
  isEnabled?: boolean;
  description?: string;
}

export interface CreateMailboxInput {
  name: string;
  domainId: string;
  description?: string;
  /** Plaintext secret — the provider hashes/stores it however it likes. */
  password: string;
  /** Quota in bytes. Defaults to 1 GiB. */
  quotaBytes?: number;
}

export interface CreateAliasInput {
  name: string;
  domainId: string;
  targets: ProviderAlias['targets'];
  description?: string;
}

export interface ProviderMessage {
  id: string;
  mailboxId: string;
  from: string;
  to: string[];
  subject: string;
  /** ISO 8601. */
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  /** A short text snippet (first ~200 chars of the body) for list views. */
  preview: string;
  /** Folder name: "Inbox", "Sent", "Drafts", "Trash", "Junk", or a custom label. */
  folder: string;
}

export interface IEmailProvider {
  // ── Domains ───────────────────────────────────────────────────────
  /** Create or idempotently retrieve a domain. */
  ensureDomain(input: CreateDomainInput): Promise<ProviderDomain>;
  listDomains(): Promise<ProviderDomain[]>;
  deleteDomain(id: string): Promise<void>;

  // ── Mailboxes ─────────────────────────────────────────────────────
  /** Create a mailbox with the given password (plaintext). */
  createMailbox(input: CreateMailboxInput): Promise<ProviderMailbox>;
  getMailbox(id: string): Promise<ProviderMailbox | null>;
  listMailboxes(domainId?: string): Promise<ProviderMailbox[]>;
  setMailboxPassword(id: string, newPassword: string): Promise<void>;
  setMailboxEnabled(id: string, enabled: boolean): Promise<void>;
  deleteMailbox(id: string): Promise<void>;

  // ── Aliases ───────────────────────────────────────────────────────
  createAlias(input: CreateAliasInput): Promise<ProviderAlias>;
  getAlias(id: string): Promise<ProviderAlias | null>;
  listAliases(domainId?: string): Promise<ProviderAlias[]>;
  setAliasTargets(id: string, targets: ProviderAlias['targets']): Promise<void>;
  setAliasEnabled(id: string, enabled: boolean): Promise<void>;
  deleteAlias(id: string): Promise<void>;

  // ── Message store (read paths for the inbox/outbox UI) ────────────
  listMessages(
    mailboxId: string,
    filter: { folder?: 'Inbox' | 'Sent' | 'Drafts' | 'Trash' | 'Junk'; unread?: boolean; limit?: number; offset?: number },
  ): Promise<ProviderMessage[]>;
  getMessage(id: string): Promise<ProviderMessage | null>;
  setMessageRead(id: string, isRead: boolean): Promise<void>;
  setMessageStarred(id: string, starred: boolean): Promise<void>;
  deleteMessages(ids: string[]): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('IEmailProvider');
