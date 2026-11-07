/**
 * Email webhook dispatch — listens to platform events, signs payloads
 * (HMAC-SHA256), and POSTs to subscribed URLs with retry.
 *
 * Signing: HMAC-SHA256 over raw JSON body, sent as
 * `X-FIDScript-Signature: sha256=<hex>`.
 *
 * Retry: 3 attempts with 1s / 5s / 15s backoff. Failure increments the
 * subscription's `failureCount`; success increments `successCount`.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

interface PlatformEventEnvelope {
  type?: string;
  projectId?: string;
  timestamp?: Date | string;
  metadata?: {
    messageId?: string;
    to?: string;
    from?: string;
    subject?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class EmailWebhookDispatchService {
  private readonly logger = new Logger(EmailWebhookDispatchService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('email.**')
  async onEmailEvent(event: PlatformEventEnvelope) {
    const eventType = event?.type;
    const projectId = event?.projectId;
    if (!eventType || !projectId) return;

    const webhookEvent = this.mapEventType(eventType);
    if (!webhookEvent) return;

    const subs = await this.prisma.emailWebhookSubscription.findMany({
      where: { projectId, isActive: true },
    });
    if (!subs?.length) return;

    const payload = {
      event: webhookEvent,
      messageId: event.metadata?.messageId,
      projectId,
      to: event.metadata?.to,
      from: event.metadata?.from,
      subject: event.metadata?.subject,
      timestamp: event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : (event.timestamp ?? new Date().toISOString()),
      metadata: event.metadata,
    };

    for (const sub of subs) {
      const events = sub.events as string[];
      if (!events?.includes(webhookEvent)) continue;
      this.deliver(sub.url, sub.secret, payload).catch(() => {});
    }
  }

  /** Send a test event to verify the URL + secret are wired correctly. */
  async test(projectId: string, id: string) {
    const sub = await this.prisma.emailWebhookSubscription.findUnique({ where: { id } });
    if (!sub) throw new Error('Webhook subscription not found');
    const payload = {
      event: 'test',
      messageId: 'test-' + Date.now(),
      projectId,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from FIDScript Email',
    };
    const result = await this.deliver(sub.url, sub.secret, payload);
    return { ...result, url: sub.url };
  }

  private async deliver(
    url: string,
    secret: string,
    payload: Record<string, unknown>,
  ): Promise<{ delivered: boolean; statusCode?: number; attempts: number }> {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    let attempts = 0;
    const maxAttempts = 3;
    const delays = [1000, 5000, 15000];

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await axios.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-FIDScript-Signature': `sha256=${signature}`,
            'User-Agent': 'FIDScript-Email-Webhook/1.0',
          },
          timeout: 10000,
        });
        await this.updateDeliveryStats(url, true);
        return { delivered: true, statusCode: res.status, attempts };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Webhook attempt ${attempts}/${maxAttempts} failed for ${url}: ${msg}`);
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, delays[attempts - 1]));
        }
      }
    }

    await this.updateDeliveryStats(url, false);
    this.logger.error(`Webhook permanently failed for ${url} after ${maxAttempts} attempts`);
    return { delivered: false, attempts };
  }

  private async updateDeliveryStats(url: string, success: boolean) {
    try {
      await this.prisma.emailWebhookSubscription.updateMany({
        where: { url },
        data: success
          ? { lastStatus: 'ok', lastSentAt: new Date(), successCount: { increment: 1 } }
          : { lastStatus: 'failed', failureCount: { increment: 1 } },
      });
    } catch { /* non-fatal */ }
  }

  private mapEventType(platformEventType: string): string | null {
    const map: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.failed': 'failed',
    };
    return map[platformEventType] ?? null;
  }
}
