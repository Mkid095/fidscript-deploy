/**
 * Email templates, analytics, suppressions, webhooks.
 * Split out of email.ts for ANPAS 150-line limit.
 */

import type { FidscriptClient } from '../client';
import type {
  EmailTemplate,
  TemplatePreview,
  BatchSendResult,
  DeliveryOverview,
  FailureBreakdown,
  LatencyStats,
  SendTimelineEntry,
  EmailSuppression,
  EmailWebhookSubscription,
} from '@fidscript-deploy/types';

export interface EmailTemplatesHost {
  readonly client: FidscriptClient;
  createTemplate(projectId: string, data: {
    name: string;
    description?: string;
    fromAddress?: string;
    fromName?: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    variables?: Array<{ name: string; required?: boolean; default?: string }>;
  }): Promise<EmailTemplate>;
  listTemplates(projectId: string): Promise<EmailTemplate[]>;
  getTemplate(projectId: string, templateId: string): Promise<EmailTemplate>;
  updateTemplate(projectId: string, templateId: string, data: Partial<{
    description: string; fromAddress: string; fromName: string;
    subject: string; htmlBody: string; textBody: string;
    variables: Array<{ name: string; required?: boolean; default?: string }>;
    isActive: boolean;
  }>): Promise<EmailTemplate>;
  deleteTemplate(projectId: string, templateId: string): Promise<void>;
  previewTemplate(projectId: string, templateId: string): Promise<TemplatePreview>;
  sendTemplated(projectId: string, templateId: string, data: {
    to: string; from?: string; replyTo?: string;
    variables: Record<string, string>; apiKeyId?: string;
  }): Promise<{ messageId: string; status: string }>;
  sendTemplateBatch(projectId: string, data: {
    templateId: string; from?: string; replyTo?: string;
    recipients: Array<{ to: string; variables: Record<string, string> }>;
    apiKeyId?: string;
  }): Promise<BatchSendResult>;
  getDeliveryOverview(projectId: string, days?: number): Promise<DeliveryOverview>;
  getFailureBreakdown(projectId: string, days?: number): Promise<FailureBreakdown[]>;
  getLatency(projectId: string, days?: number): Promise<LatencyStats>;
  getSendTimeline(projectId: string, days?: number): Promise<SendTimelineEntry[]>;
  listSuppressions(projectId: string): Promise<EmailSuppression[]>;
  addSuppression(projectId: string, email: string): Promise<void>;
  removeSuppression(projectId: string, email: string): Promise<void>;
  listWebhooks(projectId: string): Promise<EmailWebhookSubscription[]>;
  createWebhook(projectId: string, data: { url: string; events: string[] }): Promise<EmailWebhookSubscription>;
  updateWebhook(projectId: string, id: string, data: Partial<{ url: string; events: string[]; isActive: boolean }>): Promise<void>;
  deleteWebhook(projectId: string, id: string): Promise<void>;
  testWebhook(projectId: string, id: string): Promise<void>;
}

export function applyEmailTemplatesMethods(host: EmailTemplatesHost): void {
  const client = host.client;

  host.createTemplate = (projectId, data) =>
    client.post(`/api/v1/projects/${projectId}/email/templates`, data);

  host.listTemplates = (projectId) =>
    client.get<EmailTemplate[]>(`/api/v1/projects/${projectId}/email/templates`);

  host.getTemplate = (projectId, templateId) =>
    client.get(`/api/v1/projects/${projectId}/email/templates/${templateId}`);

  host.updateTemplate = (projectId, templateId, data) =>
    client.patch(`/api/v1/projects/${projectId}/email/templates/${templateId}`, data);

  host.deleteTemplate = (projectId, templateId) =>
    client.delete(`/api/v1/projects/${projectId}/email/templates/${templateId}`);

  host.previewTemplate = (projectId, templateId) =>
    client.get<TemplatePreview>(`/api/v1/projects/${projectId}/email/templates/${templateId}/preview`);

  host.sendTemplated = (projectId, templateId, data) =>
    client.post(`/api/v1/projects/${projectId}/email/templates/${templateId}/send`, data);

  host.sendTemplateBatch = (projectId, data) =>
    client.post<BatchSendResult>(`/api/v1/projects/${projectId}/email/templates/send-batch`, data);

  host.getDeliveryOverview = (projectId, days) =>
    client.get<DeliveryOverview>(`/api/v1/projects/${projectId}/email/analytics/overview`, days ? { days } : {});

  host.getFailureBreakdown = (projectId, days) =>
    client.get<FailureBreakdown[]>(`/api/v1/projects/${projectId}/email/analytics/failures`, days ? { days } : {});

  host.getLatency = (projectId, days) =>
    client.get<LatencyStats>(`/api/v1/projects/${projectId}/email/analytics/latency`, days ? { days } : {});

  host.getSendTimeline = (projectId, days) =>
    client.get<SendTimelineEntry[]>(`/api/v1/projects/${projectId}/email/analytics/timeline`, days ? { days } : {});

  host.listSuppressions = (projectId) =>
    client.get<EmailSuppression[]>(`/api/v1/projects/${projectId}/email/suppressions`);

  host.addSuppression = (projectId, email) =>
    client.post(`/api/v1/projects/${projectId}/email/suppressions`, { email });

  host.removeSuppression = (projectId, email) =>
    client.delete(`/api/v1/projects/${projectId}/email/suppressions/${encodeURIComponent(email)}`);

  host.listWebhooks = (projectId) =>
    client.get<EmailWebhookSubscription[]>(`/api/v1/projects/${projectId}/email/webhooks`);

  host.createWebhook = (projectId, data) =>
    client.post<EmailWebhookSubscription>(`/api/v1/projects/${projectId}/email/webhooks`, data);

  host.updateWebhook = (projectId, id, data) =>
    client.patch(`/api/v1/projects/${projectId}/email/webhooks/${id}`, data);

  host.deleteWebhook = (projectId, id) =>
    client.delete(`/api/v1/projects/${projectId}/email/webhooks/${id}`);

  host.testWebhook = (projectId, id) =>
    client.post(`/api/v1/projects/${projectId}/email/webhooks/${id}/test`, {});
}