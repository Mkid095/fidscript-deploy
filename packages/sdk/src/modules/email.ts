/**
 * EmailModule — per-project + platform-admin email operations.
 *
 * Sub-modules (each ≤150 lines):
 * - email-admin.ts          — AdminMailboxModule, AdminAttachmentConfigModule,
 *                              AdminMailConnectionModule (platform-admin only)
 * - email-mailboxes.ts      — per-project mailbox/alias/domain/message methods
 * - email-templates.ts      — per-project templates/analytics/suppressions/webhooks
 *
 * The non-admin operations are attached to EmailModule via mixin functions
 * (`applyMailboxesMethods`, `applyEmailTemplatesMethods`). The admin
 * modules are public as `sdk.email.admin.*` / `attachmentConfig` / `connection`.
 */

import { FidscriptClient } from '../client';
import {
  AdminMailboxModule,
  AdminAttachmentConfigModule,
  AdminMailConnectionModule,
  type MailConnectionInfo,
} from './email-admin';
import {
  applyMailboxesMethods,
  type EmailMailboxesHost,
} from './email-mailboxes';
import {
  applyEmailTemplatesMethods,
  type EmailTemplatesHost,
} from './email-templates';

interface EmailModuleHost extends EmailMailboxesHost, EmailTemplatesHost {}

export class EmailModule implements EmailMailboxesHost, EmailTemplatesHost {
  readonly client: FidscriptClient;
  /** Platform-admin operations: mailboxes, messages, send-as-platform. */
  readonly admin: AdminMailboxModule;
  /** Platform-admin operations: attachment storage backend. */
  readonly attachmentConfig: AdminAttachmentConfigModule;
  /** Platform-admin operations: Stalwart IMAP/SMTP connection details. */
  readonly connection: AdminMailConnectionModule;

  // EmailMailboxesHost
  send!: (projectId: string, data: { to: string; from?: string; subject: string; text?: string; html?: string; replyTo?: string; apiKeyId?: string }) => Promise<{ messageId: string; accepted: string[]; status: string; error?: string }>;
  listMailboxes!: (projectId: string) => Promise<import('@fidscript-deploy/types').Mailbox[]>;
  createMailbox!: (projectId: string, data: { domain: string; localPart: string; password: string; name?: string; quotaMb?: number }) => Promise<import('@fidscript-deploy/types').Mailbox>;
  deleteMailbox!: (projectId: string, mailboxId: string) => Promise<unknown>;
  listAliases!: (projectId: string) => Promise<import('@fidscript-deploy/types').EmailAlias[]>;
  createAlias!: (projectId: string, data: { domain: string; localPart: string; targets: Array<{ type: 'mailbox' | 'external' | 'webhook'; mailboxId?: string; address?: string; url?: string }>; description?: string }) => Promise<import('@fidscript-deploy/types').EmailAlias>;
  deleteAlias!: (projectId: string, aliasId: string) => Promise<unknown>;
  listMessages!: (projectId: string, params?: { mailboxId?: string; folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'; limit?: number; offset?: number; unread?: boolean }) => Promise<import('@fidscript-deploy/types').MailboxMessage[]>;
  getMessage!: (projectId: string, messageId: string) => Promise<import('@fidscript-deploy/types').MailboxMessage>;
  markMessagesRead!: (projectId: string, messageIds: string[], isRead: boolean) => Promise<{ updated: number }>;
  starMessage!: (projectId: string, messageId: string, starred: boolean) => Promise<import('@fidscript-deploy/types').MailboxMessage>;
  deleteMessages!: (projectId: string, messageIds: string[]) => Promise<{ deleted: number }>;
  listDomains!: (projectId: string) => Promise<import('@fidscript-deploy/types').EmailDomain[]>;
  getDomain!: (projectId: string, domainId: string) => Promise<unknown>;
  createDomain!: (projectId: string, domain: string) => Promise<unknown>;
  verifyDomain!: (projectId: string, domainId: string) => Promise<unknown>;
  deleteDomain!: (projectId: string, domainId: string) => Promise<void>;
  getCatchAll!: (projectId: string, domainId: string) => Promise<unknown>;
  setCatchAll!: (projectId: string, domainId: string, target: { type: 'mailbox'; mailboxId: string } | { type: 'external'; address: string } | { type: 'webhook'; url: string }) => Promise<{ ok: boolean }>;
  deleteCatchAll!: (projectId: string, domainId: string) => Promise<{ deleted: boolean }>;
  getMessageStatus!: (projectId: string, messageId: string) => Promise<unknown>;

  // EmailTemplatesHost
  createTemplate!: (projectId: string, data: { name: string; description?: string; fromAddress?: string; fromName?: string; subject: string; htmlBody?: string; textBody?: string; variables?: Array<{ name: string; required?: boolean; default?: string }> }) => Promise<import('@fidscript-deploy/types').EmailTemplate>;
  listTemplates!: (projectId: string) => Promise<import('@fidscript-deploy/types').EmailTemplate[]>;
  getTemplate!: (projectId: string, templateId: string) => Promise<import('@fidscript-deploy/types').EmailTemplate>;
  updateTemplate!: (projectId: string, templateId: string, data: Partial<{ description: string; fromAddress: string; fromName: string; subject: string; htmlBody: string; textBody: string; variables: Array<{ name: string; required?: boolean; default?: string }>; isActive: boolean }>) => Promise<import('@fidscript-deploy/types').EmailTemplate>;
  deleteTemplate!: (projectId: string, templateId: string) => Promise<void>;
  previewTemplate!: (projectId: string, templateId: string) => Promise<import('@fidscript-deploy/types').TemplatePreview>;
  sendTemplated!: (projectId: string, templateId: string, data: { to: string; from?: string; replyTo?: string; variables: Record<string, string>; apiKeyId?: string }) => Promise<{ messageId: string; status: string }>;
  sendTemplateBatch!: (projectId: string, data: { templateId: string; from?: string; replyTo?: string; recipients: Array<{ to: string; variables: Record<string, string> }>; apiKeyId?: string }) => Promise<import('@fidscript-deploy/types').BatchSendResult>;
  getDeliveryOverview!: (projectId: string, days?: number) => Promise<import('@fidscript-deploy/types').DeliveryOverview>;
  getFailureBreakdown!: (projectId: string, days?: number) => Promise<import('@fidscript-deploy/types').FailureBreakdown[]>;
  getLatency!: (projectId: string, days?: number) => Promise<import('@fidscript-deploy/types').LatencyStats>;
  getSendTimeline!: (projectId: string, days?: number) => Promise<import('@fidscript-deploy/types').SendTimelineEntry[]>;
  listSuppressions!: (projectId: string) => Promise<import('@fidscript-deploy/types').EmailSuppression[]>;
  addSuppression!: (projectId: string, email: string) => Promise<void>;
  removeSuppression!: (projectId: string, email: string) => Promise<void>;
  listWebhooks!: (projectId: string) => Promise<import('@fidscript-deploy/types').EmailWebhookSubscription[]>;
  createWebhook!: (projectId: string, data: { url: string; events: string[] }) => Promise<import('@fidscript-deploy/types').EmailWebhookSubscription>;
  updateWebhook!: (projectId: string, id: string, data: Partial<{ url: string; events: string[]; isActive: boolean }>) => Promise<void>;
  deleteWebhook!: (projectId: string, id: string) => Promise<void>;
  testWebhook!: (projectId: string, id: string) => Promise<void>;

  constructor(client: FidscriptClient) {
    this.client = client;
    applyMailboxesMethods(this as unknown as EmailMailboxesHost);
    applyEmailTemplatesMethods(this as unknown as EmailTemplatesHost);
    this.admin = new AdminMailboxModule(client);
    this.attachmentConfig = new AdminAttachmentConfigModule(client);
    this.connection = new AdminMailConnectionModule(client);
  }
}

// Re-exports for backwards compatibility
export {
  AdminMailboxModule,
  AdminAttachmentConfigModule,
  AdminMailConnectionModule,
} from './email-admin';
export type { MailConnectionInfo } from './email-admin';
export type {
  PlatformMailboxMessage,
  PlatformMailboxSummary,
  PlatformMailboxesResponse,
  CreatePlatformMailboxResponse,
  ListPlatformMessagesResponse,
  AdminSendMailResponse,
  AdminAttachmentConfig,
  StorageBackend,
  MailboxMessage,
  EmailDomain,
  Mailbox,
  EmailAlias,
} from '@fidscript-deploy/types';
