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

export class EmailModule {
  readonly client: FidscriptClient;
  /** Platform-admin operations: mailboxes, messages, send-as-platform. */
  readonly admin: AdminMailboxModule;
  /** Platform-admin operations: attachment storage backend. */
  readonly attachmentConfig: AdminAttachmentConfigModule;
  /** Platform-admin operations: Stalwart IMAP/SMTP connection details. */
  readonly connection: AdminMailConnectionModule;

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
