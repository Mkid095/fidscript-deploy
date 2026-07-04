import { FidscriptClient } from '../client';
import type {
  EmailMessage,
  MailboxMessage,
  Mailbox,
  EmailAlias,
  EmailDomain,
  EmailTemplate,
  TemplatePreview,
  BatchSendResult,
  EmailMessageStatus,
  DeliveryOverview,
  FailureBreakdown,
  LatencyStats,
  SendTimelineEntry,
  EmailSuppression,
  EmailWebhookSubscription,
  PlatformMailboxMessage,
  PlatformMailboxesResponse,
  CreatePlatformMailboxResponse,
  ListPlatformMessagesResponse,
  AdminSendMailResponse,
  AdminAttachmentConfig,
  StorageBackend,
  PlatformMailboxSummary,
} from '@fidscript-deploy/types';

export type {
  EmailMessage,
  MailboxMessage,
  Mailbox,
  EmailAlias,
  EmailDomain,
  EmailTemplate,
  TemplatePreview,
  BatchSendResult,
  EmailMessageStatus,
  DeliveryOverview,
  FailureBreakdown,
  LatencyStats,
  SendTimelineEntry,
  EmailSuppression,
  EmailWebhookSubscription,
  PlatformMailboxMessage,
  PlatformMailboxesResponse,
  CreatePlatformMailboxResponse,
  ListPlatformMessagesResponse,
  AdminSendMailResponse,
  AdminAttachmentConfig,
  StorageBackend,
  PlatformMailboxSummary,
};

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

  async send(projectId: string, data: { to: string; from?: string; subject: string; text?: string; html?: string; replyTo?: string; apiKeyId?: string }) {
    return this.client.post<{ messageId: string; accepted: string[]; status: string; error?: string }>(`/api/v1/projects/${projectId}/email/send`, data);
  }

  async listMailboxes(projectId: string) {
    const res = await this.client.get<{ mailboxes: Mailbox[] }>(`/api/v1/projects/${projectId}/email/mailboxes`);
    return res.mailboxes;
  }

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

  async listMessages(
    projectId: string,
    params: { mailboxId?: string; folder?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'; limit?: number; offset?: number; unread?: boolean } = {},
  ): Promise<MailboxMessage[]> {
    return this.client.get(`/api/v1/projects/${projectId}/email/messages`, params);
  }

  async getMessage(projectId: string, messageId: string): Promise<MailboxMessage> {
    return this.client.get(`/api/v1/projects/${projectId}/email/messages/${messageId}`);
  }

  async markMessagesRead(projectId: string, messageIds: string[], isRead: boolean): Promise<{ updated: number }> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/messages/read`, { messageIds, isRead });
  }

  async starMessage(projectId: string, messageId: string, starred: boolean): Promise<MailboxMessage> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/messages/${messageId}/star?starred=${starred}`);
  }

  async deleteMessages(projectId: string, messageIds: string[]): Promise<{ deleted: number }> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/messages`, { messageIds });
  }

  // ── Email domain management ──────────────────────────────────────────────────

  async listDomains(projectId: string): Promise<EmailDomain[]> {
    const res = await this.client.get<{ domains: EmailDomain[] }>(`/api/v1/projects/${projectId}/email/domains`);
    return res.domains ?? [];
  }

  async getDomain(projectId: string, domainId: string): Promise<EmailDomain> {
    return this.client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}`);
  }

  async createDomain(projectId: string, domain: string): Promise<EmailDomain & { ownershipToken: string; steps: string[] }> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains`, { domain });
  }

  async verifyDomain(projectId: string, domainId: string): Promise<EmailDomain> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/verify`);
  }

  async deleteDomain(projectId: string, domainId: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}`);
  }

  // ── Catch-all rules ─────────────────────────────────────────────────────────

  async getCatchAll(projectId: string, domainId: string): Promise<{ id: string; target: Record<string, unknown>; isActive: boolean } | null> {
    return this.client.get(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);
  }

  async setCatchAll(
    projectId: string,
    domainId: string,
    target: { type: 'mailbox' | 'external'; targetId?: string; targetAddress?: string },
  ): Promise<{ ok: boolean }> {
    return this.client.post(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`, target);
  }

  async deleteCatchAll(projectId: string, domainId: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/domains/${domainId}/catch-all`);
  }

  // ── Email Templates ───────────────────────────────────────────────────────

  async createTemplate(
    projectId: string,
    data: {
      name: string;
      description?: string;
      fromAddress?: string;
      fromName?: string;
      subject: string;
      htmlBody?: string;
      textBody?: string;
      variables?: Array<{ name: string; required?: boolean; default?: string }>;
    },
  ): Promise<EmailTemplate> {
    return this.client.post(`/api/v1/projects/${projectId}/email/templates`, data);
  }

  async listTemplates(projectId: string): Promise<EmailTemplate[]> {
    return this.client.get<EmailTemplate[]>(`/api/v1/projects/${projectId}/email/templates`);
  }

  async getTemplate(projectId: string, templateId: string): Promise<EmailTemplate> {
    return this.client.get<EmailTemplate>(`/api/v1/projects/${projectId}/email/templates/${templateId}`);
  }

  async updateTemplate(
    projectId: string,
    templateId: string,
    data: Partial<{
      description: string;
      fromAddress: string;
      fromName: string;
      subject: string;
      htmlBody: string;
      textBody: string;
      variables: Array<{ name: string; required?: boolean; default?: string }>;
      isActive: boolean;
    }>,
  ): Promise<EmailTemplate> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/templates/${templateId}`, data);
  }

  async deleteTemplate(projectId: string, templateId: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/templates/${templateId}`);
  }

  async previewTemplate(projectId: string, templateId: string): Promise<TemplatePreview> {
    return this.client.get<TemplatePreview>(`/api/v1/projects/${projectId}/email/templates/${templateId}/preview`);
  }

  async sendTemplated(
    projectId: string,
    templateId: string,
    data: { to: string; from?: string; replyTo?: string; variables: Record<string, string>; apiKeyId?: string },
  ): Promise<{ messageId: string; status: string }> {
    return this.client.post(`/api/v1/projects/${projectId}/email/templates/${templateId}/send`, data);
  }

  async sendTemplateBatch(
    projectId: string,
    data: {
      templateId: string;
      from?: string;
      replyTo?: string;
      recipients: Array<{ to: string; variables: Record<string, string> }>;
      apiKeyId?: string;
    },
  ): Promise<BatchSendResult> {
    return this.client.post<BatchSendResult>(`/api/v1/projects/${projectId}/email/templates/send-batch`, data);
  }

  async getMessageStatus(projectId: string, messageId: string): Promise<EmailMessageStatus> {
    return this.client.get<EmailMessageStatus>(`/api/v1/projects/${projectId}/email/messages/${messageId}/status`);
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getDeliveryOverview(projectId: string, days?: number): Promise<DeliveryOverview> {
    return this.client.get<DeliveryOverview>(`/api/v1/projects/${projectId}/email/analytics/overview`, days ? { days } : {});
  }

  async getFailureBreakdown(projectId: string, days?: number): Promise<FailureBreakdown[]> {
    return this.client.get<FailureBreakdown[]>(`/api/v1/projects/${projectId}/email/analytics/failures`, days ? { days } : {});
  }

  async getLatency(projectId: string, days?: number): Promise<LatencyStats> {
    return this.client.get<LatencyStats>(`/api/v1/projects/${projectId}/email/analytics/latency`, days ? { days } : {});
  }

  async getSendTimeline(projectId: string, days?: number): Promise<SendTimelineEntry[]> {
    return this.client.get<SendTimelineEntry[]>(`/api/v1/projects/${projectId}/email/analytics/timeline`, days ? { days } : {});
  }

  // ── Suppression List ───────────────────────────────────────────────────────

  async listSuppressions(projectId: string): Promise<EmailSuppression[]> {
    return this.client.get<EmailSuppression[]>(`/api/v1/projects/${projectId}/email/suppressions`);
  }

  async addSuppression(projectId: string, email: string): Promise<void> {
    return this.client.post(`/api/v1/projects/${projectId}/email/suppressions`, { email });
  }

  async removeSuppression(projectId: string, email: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/suppressions/${encodeURIComponent(email)}`);
  }

  // ── Email Webhooks ─────────────────────────────────────────────────────────

  async listWebhooks(projectId: string): Promise<EmailWebhookSubscription[]> {
    return this.client.get<EmailWebhookSubscription[]>(`/api/v1/projects/${projectId}/email/webhooks`);
  }

  async createWebhook(projectId: string, data: { url: string; events: string[] }): Promise<EmailWebhookSubscription> {
    return this.client.post<EmailWebhookSubscription>(`/api/v1/projects/${projectId}/email/webhooks`, data);
  }

  async updateWebhook(projectId: string, id: string, data: Partial<{ url: string; events: string[]; isActive: boolean }>): Promise<void> {
    return this.client.patch(`/api/v1/projects/${projectId}/email/webhooks/${id}`, data);
  }

  async deleteWebhook(projectId: string, id: string): Promise<void> {
    return this.client.delete(`/api/v1/projects/${projectId}/email/webhooks/${id}`);
  }

  async testWebhook(projectId: string, id: string): Promise<void> {
    return this.client.post(`/api/v1/projects/${projectId}/email/webhooks/${id}/test`, {});
  }
}
