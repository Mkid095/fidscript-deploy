/**
 * Abuse detection store — DB operations for `emailAbuseEvent` rows and the
 * tier downgrade side-effect when a critical spike is detected.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class AbuseDetectionStoreService {
  private readonly logger = new Logger(AbuseDetectionStoreService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  /** Persist an abuse event. Idempotent — duplicate inserts are silently ignored. */
  async recordEvent(
    domainId: string,
    projectId: string,
    type: string,
    severity: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.emailAbuseEvent.create({
        data: { domainId, projectId, type, severity, details: details as object },
      });
    } catch {
      // Already recorded — ignore
    }

    this.logger.warn(
      `[abuse] ${type} detected domain=${domainId} project=${projectId} severity=${severity}`,
      JSON.stringify(details),
    );

    await this.events.emit('email.abuse.detected', projectId, {
      domainId, type, severity, details,
    }, {});
  }

  /**
   * Auto-downgrade a domain to the 'blocked' tier (the kill switch for
   * spam outbreaks). Idempotent.
   */
  async autoBlockDomain(domainId: string): Promise<void> {
    await this.prisma.emailDomainReputation.update({
      where: { domainId },
      data: { tier: 'blocked' },
    }).catch(() => {});
  }

  /** Count bounced delivery attempts in the last 1h for a domain. */
  async countBouncesSince(
    domainId: string,
    sinceMs: number,
  ): Promise<number> {
    return this.prisma.emailDeliveryAttempt.count({
      where: {
        message: { senderIdentity: { domainId } },
        status: 'bounced',
        createdAt: { gte: new Date(Date.now() - sinceMs) },
      },
    });
  }

  /** Count all send attempts in the last 1h for a domain. */
  async countSendsSince(domainId: string, sinceMs: number): Promise<number> {
    return this.prisma.emailDeliveryAttempt.count({
      where: {
        message: { senderIdentity: { domainId } },
        createdAt: { gte: new Date(Date.now() - sinceMs) },
      },
    });
  }

  /** Count complaints in the last 1h for a domain. */
  async countComplaintsSince(domainId: string, sinceMs: number): Promise<number> {
    return this.prisma.emailSuppression.count({
      where: { domainId, reason: 'COMPLAINT', createdAt: { gte: new Date(Date.now() - sinceMs) } },
    });
  }

  /**
   * 7-day daily average for growth-spike detection.
   * Returns null if there are fewer than 2 days of data (insufficient
   * baseline).
   */
  async sevenDayAverageDailySends(domainId: string): Promise<{ avg: number; days: number } | null> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
    const result = await this.prisma.emailApiUsage.aggregate({
      where: { apiKey: { project: { emailDomains: { some: { id: domainId } } } }, date: { gte: sevenDaysAgo } },
      _sum: { sends: true },
      _count: { _all: true },
    });
    if (!result._count._all || result._count._all < 2) return null;
    return { avg: (result._sum.sends ?? 0) / result._count._all, days: result._count._all };
  }

  /** Today's sends for a domain (used by the growth-spike comparator). */
  async todaySends(domainId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await this.prisma.emailApiUsage.aggregate({
      where: { apiKey: { project: { emailDomains: { some: { id: domainId } } } }, date: { gte: today } },
      _sum: { sends: true },
    });
    return result._sum.sends ?? 0;
  }

  /** Domain lookup — used to surface the domain name in auto-block events. */
  async findDomain(domainId: string) {
    return this.prisma.emailDomain.findUnique({ where: { id: domainId } });
  }
}
