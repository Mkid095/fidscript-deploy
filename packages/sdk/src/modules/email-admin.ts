/**
 * Email admin modules — Platform-admin operations for mailboxes,
 * attachment storage backends, and Stalwart IMAP/SMTP connection info.
 *
 * Split out of email.ts for ANPAS 150-line limit.
 */

import { FidscriptClient } from '../client';
import type {
  PlatformMailboxesResponse,
  CreatePlatformMailboxResponse,
  ListPlatformMessagesResponse,
  PlatformMailboxMessage,
  AdminSendMailResponse,
  AdminAttachmentConfig,
  StorageBackend,
} from '@fidscript-deploy/types';

/** Platform-admin mailbox operations (alert@, noreply@, postmaster@, custom). */
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

/** IMAP/SMTP connection details for configuring a mail client against Stalwart. */
export interface MailConnectionInfo {
  hostname: string;
  imap: { host: string; port: number; tls: boolean };
  smtp: { host: string; port: number; secure: boolean; submissionPort: number };
  authMethod: 'PLAIN' | 'LOGIN';
  usernameFormat: 'full-email';
  tlsVersion: 'TLSv1.2+';
}

/** Platform-admin mailbox connection-details (Stalwart IMAP/SMTP/submission). */
export class AdminMailConnectionModule {
  constructor(private client: FidscriptClient) {}

  async get() {
    return this.client.get<MailConnectionInfo>('/admin/mail/connection');
  }
}