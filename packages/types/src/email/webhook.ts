/**
 * Email webhook types — shared across API, SDK, and MCP contracts.
 */

export type WebhookEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';

/** A registered email webhook subscription. */
export interface EmailWebhookSubscription {
  id: string;
  projectId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  lastStatus?: string | null;
  lastSentAt?: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Payload delivered to a webhook URL. */
export interface WebhookPayload {
  event: WebhookEventType;
  messageId?: string;
  projectId: string;
  to?: string;
  from?: string;
  subject?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
