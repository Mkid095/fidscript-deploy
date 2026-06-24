import { FidscriptClient } from '../client';

export interface EmailMessage {
  id: string;
  to: string;
  from?: string;
  subject: string;
  status: string;
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

  async createMailbox(projectId: string, email: string, name?: string) {
    return this.client.post<Mailbox>(`/api/v1/projects/${projectId}/email/mailboxes`, { email, name });
  }

  async deleteMailbox(projectId: string, mailboxId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/mailboxes/${mailboxId}`);
  }

  async listAliases(projectId: string) {
    const res = await this.client.get<{ aliases: EmailAlias[] }>(`/api/v1/projects/${projectId}/email/aliases`);
    return res.aliases;
  }

  async createAlias(projectId: string, alias: string, forwardsTo: string[]) {
    return this.client.post<EmailAlias>(`/api/v1/projects/${projectId}/email/aliases`, { alias, forwardsTo });
  }

  async deleteAlias(projectId: string, aliasId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/email/aliases/${aliasId}`);
  }
}
