/**
 * Email webhook subscriptions — per-project URL registrations for email lifecycle events.
 *
 * Listens to email events and dispatches signed payloads to subscribed URLs.
 * Events supported: delivered, opened, clicked, bounced, complained.
 *
 * Signing: HMAC-SHA256 over raw JSON body, sent as X-FIDScript-Signature header.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

const VALID_EVENTS = ['delivered', 'opened', 'clicked', 'bounced', 'complained', 'sent', 'failed'];

@Injectable()
export class EmailWebhookSubscriptionService {
  private readonly logger = new Logger(EmailWebhookSubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  // ── CRUD ──────────────────────────────────────────────────────────

  async list(projectId: string) {
    return (this.prisma as any).emailWebhookSubscription.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(projectId: string, input: { url: string; events: string[] }) {
    this.validateEvents(input.events);
    const secret = crypto.randomBytes(32).toString('hex');
    return (this.prisma as any).emailWebhookSubscription.create({
      data: {
        projectId,
        url: input.url,
        secret,
        events: input.events,
      },
    });
  }

  async update(projectId: string, id: string, input: Partial<{ url: string; events: string[]; isActive: boolean }>) {
    if (input.events) this.validateEvents(input.events);
    return (this.prisma as any).emailWebhookSubscription.update({
      where: { id },
      data: input,
    });
  }

  async delete(projectId: string, id: string) {
    await (this.prisma as any).emailWebhookSubscription.delete({ where: { id } });
    return { deleted: true };
  }

  async test(projectId: string, id: string) {
    const sub = await (this.prisma as any).emailWebhookSubscription.findUnique({ where: { id } });
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

  // ── Event Listeners ──────────────────────────────────────────────

  @OnEvent('email.**')
  async onEmailEvent(event: any) {
    const eventType = event?.type as string | undefined;
    const projectId = event?.projectId as string | undefined;
    if (!eventType || !projectId) return;

    // Map platform event types to webhook event names
    const webhookEvent = this.mapEventType(eventType);
    if (!webhookEvent) return;

    const subs = await (this.prisma as any).emailWebhookSubscription.findMany({
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
      timestamp: event.timestamp?.toISOString() ?? new Date().toISOString(),
      metadata: event.metadata,
    };

    for (const sub of subs) {
      const events = sub.events as string[];
      if (!events?.includes(webhookEvent)) continue;
      this.deliver(sub.url, sub.secret, payload).catch(() => {});
    }
  }

  // ── Delivery ─────────────────────────────────────────────────────

  private async deliver(
    url: string,
    secret: string,
    payload: any,
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
          await new Promise(r => setTimeout(r, delays[attempts - 1]));
        }
      }
    }

    await this.updateDeliveryStats(url, false);
    this.logger.error(`Webhook permanently failed for ${url} after ${maxAttempts} attempts`);
    return { delivered: false, attempts };
  }

  private async updateDeliveryStats(url: string, success: boolean) {
    try {
      await (this.prisma as any).emailWebhookSubscription.updateMany({
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

  private validateEvents(events: string[]) {
    const invalid = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalid.length) {
      throw new Error(`Invalid event types: ${invalid.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}`);
    }
  }
}
