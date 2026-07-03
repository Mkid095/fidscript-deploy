/**
 * Email open/click tracking.
 *
 * Two mechanisms:
 *   1. Open tracking: a 1x1 transparent GIF embedded in HTML emails.
 *      GET /email/t/open/:messageId → records open + serves pixel.
 *   2. Click tracking: links rewritten to go through a redirect endpoint.
 *      GET /email/t/click/:messageId?url=<url> → records click + 302 redirect.
 *
 * The HTML body injection happens in EmailTrackingService.injectTrackers()
 * which is called by the worker before SMTP delivery.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  /**
   * Record an open event from the tracking pixel.
   */
  async recordOpen(messageId: string, meta: { userAgent?: string; ip?: string }): Promise<Buffer> {
    try {
      const message = await this.prisma.emailMessage.findUnique({
        where: { id: messageId },
        select: { projectId: true, status: true },
      });

      if (message) {
        await (this.prisma as any).emailTrackingEvent.create({
          data: {
            messageId,
            projectId: message.projectId,
            type: 'open',
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
          },
        });

        // Update message status to OPENED (only if not already past that state)
        const terminalStates = ['OPENED', 'CLICKED', 'BOUNCED', 'DEAD', 'FAILED'];
        if (!terminalStates.includes(message.status)) {
          await this.prisma.emailMessage.update({
            where: { id: messageId },
            data: { status: 'OPENED' as any },
          }).catch(() => {});
        }

        await this.events.emit('email.opened', message.projectId, {
          messageId,
          userAgent: meta.userAgent,
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
      const message = await this.prisma.emailMessage.findUnique({
        where: { id: messageId },
        select: { projectId: true, status: true },
      });

      if (message) {
        await (this.prisma as any).emailTrackingEvent.create({
          data: {
            messageId,
            projectId: message.projectId,
            type: 'click',
            url,
            userAgent: meta.userAgent,
            ipAddress: meta.ip,
          },
        });

        // Update status to CLICKED
        await this.prisma.emailMessage.update({
          where: { id: messageId },
          data: { status: 'CLICKED' as any },
        }).catch(() => {});

        await this.events.emit('email.clicked', message.projectId, {
          messageId,
          url,
        }, {});
      }
    } catch (err) {
      this.logger.warn(`Failed to record click for ${messageId}: ${(err as Error).message}`);
    }

    return url;
  }

  /**
   * Inject tracking pixel + rewrite links in HTML body.
   * Called by the worker before SMTP delivery.
   */
  injectTrackers(html: string, messageId: string, trackingDomain: string): string {
    if (!html) return html;

    let result = html;

    // 1. Rewrite <a href="..."> links through the click tracker
    result = result.replace(
      /<a\s+([^>]*?)href=["'](https?:\/\/[^"']+)["']([^>]*)>/gi,
      (match, pre: string, href: string, post: string) => {
        const trackedUrl = `https://${trackingDomain}/email/t/click/${messageId}?url=${encodeURIComponent(href)}`;
        return `<a ${pre}href="${trackedUrl}"${post}>`;
      },
    );

    // 2. Append tracking pixel before </body>
    const pixelUrl = `https://${trackingDomain}/email/t/open/${messageId}`;
    const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;outline:none;"/>`;

    if (result.includes('</body>')) {
      result = result.replace('</body>', `${pixel}</body>`);
    } else {
      result = result + pixel;
    }

    return result;
  }

  /**
   * Get tracking stats for a message.
   */
  async getTrackingStats(messageId: string) {
    const events = await (this.prisma as any).emailTrackingEvent.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    });

    const opens = events.filter((e: any) => e.type === 'open');
    const clicks = events.filter((e: any) => e.type === 'click');

    return {
      totalOpens: opens.length,
      totalClicks: clicks.length,
      uniqueOpens: new Set(opens.map((e: any) => e.ipAddress)).size,
      uniqueClicks: new Set(clicks.map((e: any) => e.ipAddress)).size,
      firstOpenedAt: opens[opens.length - 1]?.createdAt ?? null,
      lastOpenedAt: opens[0]?.createdAt ?? null,
      clickedLinks: clicks.map((c: any) => ({ url: c.url, clickedAt: c.createdAt })),
    };
  }
}
