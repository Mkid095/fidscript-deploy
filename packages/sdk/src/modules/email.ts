import { FidscriptClient } from '../client';

export interface EmailMessage {
  id: string;
  to: string;
  from?: string;
  subject: string;
  status: string;
  createdAt: string;
}

/** A message row inside a project mailbox — shape returned by MAIL-25/26/27/28/29. */
export interface MailboxMessage {
  id: string;
  mailboxId: string | null;
  senderIdentityId: string | null;
  projectId: string;
  from: string;
  to: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  sizeBytes: string | number; // Prisma BigInt serialized as string
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  spamScore: number | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface Mailbox {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface EmailAlias {
  id: string;
  alias: string;
  forwardsTo: string[];
  createdAt: string;
}

/** An email domain registered under a project — distinct from project deployment domains. */
export interface EmailDomain {
  id: string;
  projectId: string;
  domain: string;
  status: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  dkimSelector?: string;
  dkimPublicKey?: string;
  catchAllTarget?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface PlatformMailboxMessage {
  id: string;
  mailbox: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive';
  hasAttachments: boolean;
  attachmentCount: number;
  sizeBytes: number;
  bodyHtml?: string;
  bodyText?: string;
}

export type StorageBackend = 'internal' | 'telegram' | 'cloudinary';

export interface PlatformMailboxSummary {
  id: string;
  name: string;
  email: string;
  domainId: string;
  quotaBytes: number | null;
}

export interface PlatformMailboxesResponse {
  domain: string;
  domainId: string;
  mailboxes: PlatformMailboxSummary[];
}

export interface CreatePlatformMailboxResponse {
  mailbox: PlatformMailboxSummary;
  password: string;
  message: string;
}

export interface ListPlatformMessagesResponse {
  messages: PlatformMailboxMessage[];
  total: number;
}

export interface AdminSendMailResponse {
  status: string;
  messageId: string;
  from: string;
  to: string;
  attachmentsStored: number;
}

export interface AdminAttachmentConfig {
  provider: StorageBackend;
  isActive: boolean;
  hasCredentials: boolean;
}

/** Platform-admin mailbox operations (alert@, noreply@, postmaster@, custom platform mailboxes). */
export class AdminMailboxModule {
  constructor(private client: FidscriptClient) {}

  async list() {
    return this.client.get<PlatformMailboxesResponse>('/admin/mailboxes');
  }

  async create(input: { localPart: string; displayName?: string; quotaMb?: number; password?: string }) {
    return this.client.post<CreatePlatformMailboxResponse>('/admin/mailboxes', input);
  }

  async listMessages(local: string, params: { folder?: string; limit?: number; offset?: number; unread?: boolean } = {}) {
    return this.client.get<ListPlatformMessagesResponse>(`/admin/mailboxes/${local}/messages`, params);
  }

  async getMessage(local: string, id: string) {
    return this.client.get<PlatformMailboxMessage>(`/admin/mailboxes/${local}/messages/${id}`);
  }

  async patchMessage(local: string, id: string, body: { isRead?: boolean; isStarred?: boolean; moveTo?: 'inbox' | 'trash' | 'junk' | 'archive' }) {
    return this.client.patch<{ ok: boolean }>(`/admin/mailboxes/${local}/messages/${id}`, body);
  }

  async deleteMessage(local: string, id: string) {
    return this.client.delete<{ ok: boolean }>(`/admin/mailboxes/${local}/messages/${id}`);
  }

  async sendMail(body: { fromLocal?: string; to: string; subject: string; text?: string; html?: string }) {
    return this.client.post<AdminSendMailResponse>('/admin/platform-mail/send', body);
  }
}

/** Platform-admin attachment storage backend configuration. */
export class AdminAttachmentConfigModule {
  constructor(private client: FidscriptClient) {}

  async get() {
    return this.client.get<AdminAttachmentConfig>('/admin/attachment-config');
  }

  async update(input: { provider: StorageBackend; credentials?: Record<string, string> }) {
    return this.client.put<{ ok: boolean }>('/admin/attachment-config', input);
  }

  async test() {
    return this.client.post<{ ok: boolean; provider: StorageBackend; error?: string }>('/admin/attachment-config/test', {});
  }
}

export class EmailModule {
  /** Platform-admin operations: mailboxes, messages, send-as-platform. */
  readonly admin: AdminMailboxModule;
  /** Platform-admin operations: attachment storage backend. */
  readonly attachmentConfig: AdminAttachmentConfigModule;

  constructor(private client: FidscriptClient) {
    this.admin = new AdminMailboxModule(client);
    this.attachmentConfig = new AdminAttachmentConfigModule(client);
  }

  async send(projectId: string, data: { to: string; subject: string; text?: string; html?: string }) {
    return this.client.post<{ id: string }>(`/api/v1/projects/${projectId}/email/send`, data);
  }

  async listMailboxes(projectId: string) {
    const res = await this.client.get<{ mailboxes: Mailbox[] }>(`/api/v1/projects/${projectId}/email/mailboxes`);
    return res.mailboxes;
  }

  /**
   * Create a mailbox. The backend requires `domain` + `localPart` + a `password`
   * (the platform returns the plaintext password only once). Pass `name` for the
   * mailbox display name and `quotaMb` for the size cap.
   */
  async createMailbox(
    projectId: string,
    data: { domain: string; localPart: string; password: string; name?: string; quotaMb?: number },
  ): Promise<Mailbox> {
    return this.client.post<Mailbox>(`/api/v1/projects/${projectId}/email/mailboxes`, data);
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/mailboxes/${mailboxId}`);
  }

  async listAliases(projectId: string) {
    const res = await this.client.get<{ aliases: EmailAlias[] }>(`/api/v1/projects/${projectId}/email/aliases`);
    return res.aliases;
  }

  /**
   * Create an alias. The backend requires `domain` + `localPart` + a typed `targets`
   * array (each target is a mailbox, external address, or webhook URL).
   */
  async createAlias(
    projectId: string,
    data: {
      domain: string;
      localPart: string;
      targets: Array<{ type: 'mailbox' | 'external' | 'webhook'; mailboxId?: string; address?: string; url?: string }>;
      description?: string;
    },
  ): Promise<EmailAlias> {
    return this.client.post<EmailAlias>(`/api/v1/projects/${projectId}/email/aliases`, data);
  }

  async deleteAlias(projectId: string, aliasId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/aliases/${aliasId}`);
  }

  /** List messages for a project (optionally filtered by mailboxId + folder).
   *  Maps to MAIL-25. */
  async listMessages(
    projectId: string,
    params: { mailboxId?: string; folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'; limit?: number; offset?: number; unread?: boolean } = {},
  ): Promise<MailboxMessage[]> {
    return this.client.get(`/api/v1/projects/${projectId}/email/messages`, params);
  }

  /** Get a single message with body. Maps to MAIL-26. */
  async getMessage(projectId: string, messageId: string): Promise<MailboxMessage> {
    return this.client.get(`/api/v1/projects/${projectId}/email/messages/${messageId}`);
  }

  /** Mark messages read/unread in bulk. Maps to MAIL-27. */
  async markMessagesRead(projectId: string, messageIds: string[], isRead: boolean): Promise<{ updated: number }> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/messages/read`, { messageIds, isRead });
  }

  /** Star or unstar a single message. Maps to MAIL-28. */
  async starMessage(projectId: string, messageId: string, starred: boolean): Promise<MailboxMessage> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/messages/${messageId}/star?starred=${starred}`);
  }

  /** Delete messages in bulk. Maps to MAIL-29. */
  async deleteMessages(projectId: string, messageIds: string[]): Promise<{ deleted: number }> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/messages`, { messageIds });
  }

  // ── Email domain management ──────────────────────────────────────────────────

  /**
   * List all email domains for a project.
   * Route: GET /projects/:projectId/email/domains
   */
  async listDomains(projectId: string): Promise<EmailDomain[]> {
    const res = await this.client.get<{ domains: EmailDomain[] }>(
      `/api/v1/projects/${projectId}/email/domains`,
    );
    return res.domains ?? [];
  }

  /**
   * Get a single email domain.
   * Route: GET /projects/:projectId/email/domains/:domainId
   */
  async getDomain(projectId: string, domainId: string): Promise<EmailDomain> {
    return this.client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}`);
  }

  /**
   * Register a new email domain for a project.
   * Route: POST /projects/:projectId/email/domains
   */
  async createDomain(projectId: string, domain: string): Promise<EmailDomain & { ownershipToken: string; steps: string[] }> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains`, { domain });
  }

  /**
   * Trigger ownership + DNS verification for an email domain.
   * Route: POST /projects/:projectId/email/domains/:domainId/verify
   */
  async verifyDomain(projectId: string, domainId: string): Promise<EmailDomain> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/verify`);
  }

  /**
   * Remove an email domain and all its mailboxes / aliases.
   * Route: DELETE /projects/:projectId/email/domains/:domainId
   */
  async deleteDomain(projectId: string, domainId: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}`);
  }

  // ── Catch-all rules ─────────────────────────────────────────────────────────

  /**
   * Get the catch-all rule for a domain. Returns null if not configured.
   */
  async getCatchAll(projectId: string, domainId: string): Promise<{ id: string; target: Record<string, unknown>; isActive: boolean } | null> {
    return this.client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);
  }

  /**
   * Set the catch-all rule for a domain. All unmatched addresses on the domain
   * will be delivered to the specified target (mailbox, external address, or webhook).
   */
  async setCatchAll(
    projectId: string,
    domainId: string,
    target: { type: 'mailbox' | 'external'; targetId?: string; targetAddress?: string },
  ): Promise<{ ok: boolean }> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`, target);
  }

  /** Remove the catch-all rule for a domain. */
  async deleteCatchAll(projectId: string, domainId: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);
  }
}
