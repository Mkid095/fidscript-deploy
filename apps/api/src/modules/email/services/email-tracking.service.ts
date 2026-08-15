/**
 * Email open/click tracking.
 *
 * Two mechanisms:
 *   1. Open tracking: a 1x1 transparent GIF embedded in HTML emails.
 *      GET /email/t/open/:messageId → records open + serves pixel.
 *   2. Click tracking: links rewritten to go through a redirect endpoint.
 *      GET /email/t/click/:messageId?url=<url> → records click + 302 redirect.
 *
 * The HTML body injection happens in `injectTrackers()` which is called by
 * the worker before SMTP delivery.
 *
 * Split into:
 *   - EmailTrackingStoreService — DB operations
 *   - EmailTrackingService (this) — orchestration + HTML injection
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { EmailTrackingStoreService } from './email-tracking-store.service';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    private store: EmailTrackingStoreService,
    private events: EventService,
  ) {}

  /**
   * Record an open event from the tracking pixel and return the GIF bytes.
   */
  async recordOpen(messageId: string, meta: { userAgent?: string; ip?: string }): Promise<Buffer> {
    try {
      const message = await this.store.findMessageStatus(messageId);
      if (message) {
        await this.store.recordEvent(messageId, message.projectId, 'open', {
          userAgent: meta.userAgent, ipAddress: meta.ip,
        });
        await this.store.markOpenedIfNotTerminal(messageId);
        await this.events.emit('email.opened', message.projectId, {
          messageId, userAgent: meta.userAgent,
        }, {});
      }
    } catch (err) {
      this.logger.warn(`Failed to record open for ${messageId}: ${(err as Error).message}`);
    }
    return TRACKING_PIXEL;
  }

  /**
   * Record a click event and return the destination URL for redirect.
   */
  async recordClick(messageId: string, url: string, meta: { userAgent?: string; ip?: string }): Promise<string> {
    try {
      const message = await this.store.findMessageStatus(messageId);
      if (message) {
        await this.store.recordEvent(messageId, message.projectId, 'click', {
          url, userAgent: meta.userAgent, ipAddress: meta.ip,
        });
        await this.store.markClicked(messageId);
        await this.events.emit('email.clicked', message.projectId, { messageId, url }, {});
      }
    } catch (err) {
      this.logger.warn(`Failed to record click for ${messageId}: ${(err as Error).message}`);
    }
    return url;
  }

  /**
   * Inject tracking pixel + rewrite links in HTML body. Called by the
   * worker before SMTP delivery.
   */
  injectTrackers(html: string, messageId: string, trackingDomain: string): string {
    if (!html) return html;
    let result = html;

    result = result.replace(
      /<a\s+([^>]*?)href=["'](https?:\/\/[^"']+)["']([^>]*)>/gi,
      (match, pre: string, href: string, post: string) => {
        const trackedUrl = `https://${trackingDomain}/email/t/click/${messageId}?url=${encodeURIComponent(href)}`;
        return `<a ${pre}href="${trackedUrl}"${post}>`;
      },
    );

    const pixelUrl = `https://${trackingDomain}/email/t/open/${messageId}`;
    const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;outline:none;"/>`;
    if (result.includes('</body>')) {
      result = result.replace('</body>', `${pixel}</body>`);
    } else {
      result = result + pixel;
    }
    return result;
  }

  /** Tracking stats for a message (used by the dashboard stats panel). */
  async getTrackingStats(messageId: string) {
    const events = await this.store.listEvents(messageId);
    const opens = events.filter((e) => e.type === 'open');
    const clicks = events.filter((e) => e.type === 'click');
    return {
      totalOpens: opens.length,
      totalClicks: clicks.length,
      uniqueOpens: new Set(opens.map((e) => e.ipAddress)).size,
      uniqueClicks: new Set(clicks.map((e) => e.ipAddress)).size,
      firstOpenedAt: opens[opens.length - 1]?.createdAt ?? null,
      lastOpenedAt: opens[0]?.createdAt ?? null,
      clickedLinks: clicks.map((c) => ({ url: c.url, clickedAt: c.createdAt })),
    };
  }
}
