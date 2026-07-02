import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { createHmac } from 'crypto';

export interface WebhookPayload {
  event: string;
  domainId: string;
  domain: string;
  projectId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CreateWebhookDto {
  url: string;
  secret?: string;
  events?: string[];
  enabled?: boolean;
}

/**
 * DomainWebhookService
 *
 * Manages outbound webhooks for domain events. When a subscribed event fires,
 * the platform POSTs the event payload to each enabled webhook URL.
 *
 * Event delivery:
 *   POST <webhook.url>
 *   Content-Type: application/json
 *   x-fidscript-signature: sha256=<hmac>  (if secret is set)
 *
 * Payload format:
 *   {
 *     "event": "domains.health_changed",
 *     "domainId": "...",
 *     "domain": "example.com",
 *     "projectId": "...",
 *     "timestamp": "2026-07-02T...",
 *     "data": { "oldStatus": "HEALTHY", "newStatus": "DEGRADED" }
 *   }
 *
 * The listener uses @OnEvent('domains.**') to catch all domain events,
 * checks each webhook's subscription list, and delivers matching events.
 *
 * Retries: one retry on failure (non-2xx response or network error).
 * Stats: each webhook tracks delivery/failure counts and last delivery status.
 */
@Injectable()
export class DomainWebhookService {
  private readonly logger = new Logger(DomainWebhookService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new webhook for a domain.
   */
  async createWebhook(domainId: string, projectId: string, dto: CreateWebhookDto) {
    // Validate URL
    try {
      const url = new URL(dto.url);
      if (!url.protocol.startsWith('http')) throw new Error('Must be HTTP(S)');
    } catch {
      throw new BadRequestException('Invalid webhook URL — must be a valid HTTP(S) URL');
    }

    const webhook = await (this.prisma as any).domainWebhook.create({
      data: {
        domainId,
        projectId,
        url: dto.url,
        secret: dto.secret ?? null,
        events: dto.events ?? ['*'],
        enabled: dto.enabled ?? true,
      },
    });

    this.logger.log(`[webhooks] Created webhook ${webhook.id} for domain ${domainId} → ${dto.url}`);
    return { id: webhook.id, url: webhook.url, enabled: webhook.enabled };
  }

  /**
   * List all webhooks for a domain.
   */
  async listWebhooks(domainId: string) {
    const webhooks = await (this.prisma as any).domainWebhook.findMany({
      where: { domainId },
      orderBy: { createdAt: 'desc' },
    });
    return { webhooks: webhooks.map((w: any) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      enabled: w.enabled,
      lastDeliveryAt: w.lastDeliveryAt?.toISOString() ?? null,
      lastDeliveryOk: w.lastDeliveryOk,
      deliveryCount: w.deliveryCount,
      failureCount: w.failureCount,
    })) };
  }

  /**
   * Delete a webhook.
   */
  async deleteWebhook(domainId: string, webhookId: string) {
    await (this.prisma as any).domainWebhook.deleteMany({
      where: { id: webhookId, domainId },
    });
    return { success: true };
  }

  /**
   * Update a webhook (enable/disable, change URL or events).
   */
  async updateWebhook(domainId: string, webhookId: string, updates: {
    url?: string;
    events?: string[];
    enabled?: boolean;
    secret?: string;
  }) {
    const data: any = {};
    if (updates.url) data.url = updates.url;
    if (updates.events) data.events = updates.events;
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.secret !== undefined) data.secret = updates.secret || null;

    await (this.prisma as any).domainWebhook.updateMany({
      where: { id: webhookId, domainId },
      data,
    });
    return { success: true };
  }

  /**
   * Test a webhook by sending a test event.
   */
  async testWebhook(domainId: string, webhookId: string) {
    const webhook = await (this.prisma as any).domainWebhook.findFirst({
      where: { id: webhookId, domainId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      select: { domain: true, projectId: true },
    });

    const payload: WebhookPayload = {
      event: 'domains.webhook.test',
      domainId,
      domain: domain?.domain ?? 'unknown',
      projectId: domain?.projectId ?? '',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery from FIDScript Deploy' },
    };

    const result = await this.deliver(webhook, payload);
    return { success: result.success, error: result.error, deliveredAt: new Date().toISOString() };
  }

  /**
   * Deliver a webhook payload to a single webhook URL.
   * Signs with HMAC-SHA256 if secret is set. Retries once on failure.
   */
  private async deliver(
    webhook: { url: string; secret: string | null },
    payload: WebhookPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FIDScript-Webhook/1.0',
    };

    // HMAC signing
    if (webhook.secret) {
      const signature = createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
      headers['x-fidscript-signature'] = `sha256=${signature}`;
    }

    const doFetch = async () => {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`webhook responded ${res.status}`);
    };

    // Try once, retry once on failure
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await doFetch();
        return { success: true };
      } catch (err) {
        if (attempt === 2) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
        // Brief delay before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return { success: false, error: 'Unknown delivery failure' };
  }

  /**
   * Event listener — called for every domains.* event.
   * Finds matching webhooks and delivers the payload.
   */
  @OnEvent('domains.**')
  async onDomainEvent(event: {
    id: string;
    type: string;
    projectId?: string;
    metadata: Record<string, unknown>;
    resourceType?: string;
    resourceId?: string;
  }): Promise<void> {
    // Only process events with a resourceId (domain ID)
    const domainId = event.resourceType === 'domain' ? event.resourceId : null;
    if (!domainId) return;

    try {
      // Find all enabled webhooks for this domain
      const webhooks = await (this.prisma as any).domainWebhook.findMany({
        where: { domainId, enabled: true },
      });

      if (webhooks.length === 0) return;

      const domain = await this.prisma.domain.findUnique({
        where: { id: domainId },
        select: { domain: true, projectId: true },
      });
      if (!domain) return;

      const payload: WebhookPayload = {
        event: event.type,
        domainId,
        domain: domain.domain,
        projectId: domain.projectId,
        timestamp: new Date().toISOString(),
        data: event.metadata ?? {},
      };

      // Deliver to each matching webhook
      for (const webhook of webhooks) {
        // Check if this webhook is subscribed to this event
        const subscribedEvents = webhook.events as string[];
        const isSubscribed = subscribedEvents.includes('*') || subscribedEvents.includes(event.type);
        if (!isSubscribed) continue;

        // Deliver (non-blocking — don't let one slow webhook block others)
        this.deliver(webhook, payload)
          .then(result => this.updateStats(webhook.id, result.success))
          .catch(err => {
            this.logger.error(`[webhooks] Delivery to ${webhook.id} failed: ${err instanceof Error ? err.message : err}`);
            this.updateStats(webhook.id, false);
          });
      }
    } catch (err) {
      this.logger.error(`[webhooks] Event handling failed for ${event.type}: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Update webhook delivery stats after an attempt.
   */
  private async updateStats(webhookId: string, success: boolean) {
    try {
      await (this.prisma as any).domainWebhook.update({
        where: { id: webhookId },
        data: {
          lastDeliveryAt: new Date(),
          lastDeliveryOk: success,
          deliveryCount: { increment: 1 },
          ...(success ? {} : { failureCount: { increment: 1 } }),
        },
      });
    } catch { /* best-effort */ }
  }
}
