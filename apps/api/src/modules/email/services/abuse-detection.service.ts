import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { EmailReputationService } from './email-reputation.service';

/**
 * Abuse detection — detects spike patterns and auto-escalates reputation.
 *
 * Tracks rolling 1h/24h windows in Redis:
 *   abuse:bounce:${domainId}  — bounce count per hour
 *   abuse:complaint:${domainId} — complaint count per hour
 *
 * Spike thresholds:
 *   bounce_rate_1h > 10% → medium abuse event
 *   bounce_rate_1h > 25% → critical → auto-block tier
 *   complaint_rate_1h > 2% → high abuse event
 *   complaint_rate_1h > 5% → critical → auto-block tier
 *   sudden_growth: sends > 5x baseline → medium
 */
@Injectable()
export class AbuseDetectionService {
  private readonly logger = new Logger(AbuseDetectionService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private reputation: EmailReputationService,
  ) {}

  /**
   * Called by BounceParserService on every bounce event.
   */
  async onBounce(domainId: string, projectId: string): Promise<void> {
    await this.checkBounceSpike(domainId, projectId);
  }

  /**
   * Called by BounceHandlerService on every complaint event.
   */
  async onComplaint(domainId: string, projectId: string): Promise<void> {
    await this.checkComplaintSpike(domainId, projectId);
  }

  /**
   * Called after a successful send (for growth spike detection).
   */
  async onSend(domainId: string, projectId: string): Promise<void> {
    await this.checkGrowthSpike(domainId, projectId);
  }

  private async checkBounceSpike(domainId: string, projectId: string): Promise<void> {
    const domain = await this.prisma.emailDomain.findUnique({ where: { id: domainId } });
    if (!domain) return;

    // Count bounces in last 1h and 24h
    const [bounces1h, totalSends1h] = await Promise.all([
      this.prisma.emailDeliveryAttempt.count({
        where: {
          message: { senderIdentity: { domainId } },
          status: 'bounced',
          createdAt: { gte: new Date(Date.now() - 3_600_000) },
        },
      }),
      this.prisma.emailDeliveryAttempt.count({
        where: {
          message: { senderIdentity: { domainId } },
          createdAt: { gte: new Date(Date.now() - 3_600_000) },
        },
      }),
    ]);

    if (totalSends1h < 10) return; // not enough data

    const bounceRate = bounces1h / totalSends1h * 100;
    let severity: string | null = null;

    if (bounceRate > 25) severity = 'critical';
    else if (bounceRate > 10) severity = 'high';

    if (severity) {
      await this.recordAbuseEvent(domainId, projectId, 'bounce_spike', severity, {
        bounceRate: Math.round(bounceRate * 100) / 100,
        bounces1h,
        totalSends1h,
      });

      if (severity === 'critical') {
        // Auto-downgrade to blocked
        await this.prisma.emailDomainReputation.update({
          where: { domainId },
          data: { tier: 'blocked' },
        }).catch(() => {}); // create if not exists
        await this.eventService.emit('email.abuse.detected', projectId, {
          domainId,
          domain: domain.domain,
          type: 'bounce_spike',
          severity: 'critical',
          action: 'auto_blocked',
        }, {});
      }
    }
  }

  private async checkComplaintSpike(domainId: string, projectId: string): Promise<void> {
    const domain = await this.prisma.emailDomain.findUnique({ where: { id: domainId } });
    if (!domain) return;

    const [complaints1h, totalSends1h] = await Promise.all([
      this.prisma.emailSuppression.count({
        where: {
          domainId,
          reason: 'COMPLAINT',
          createdAt: { gte: new Date(Date.now() - 3_600_000) },
        },
      }),
      this.prisma.emailDeliveryAttempt.count({
        where: {
          message: { senderIdentity: { domainId } },
          createdAt: { gte: new Date(Date.now() - 3_600_000) },
        },
      }),
    ]);

    if (totalSends1h < 10) return;

    const complaintRate = complaints1h / totalSends1h * 100;
    let severity: string | null = null;

    if (complaintRate > 5) severity = 'critical';
    else if (complaintRate > 2) severity = 'high';

    if (severity) {
      await this.recordAbuseEvent(domainId, projectId, 'complaint_spike', severity, {
        complaintRate: Math.round(complaintRate * 100) / 100,
        complaints1h,
        totalSends1h,
      });

      if (severity === 'critical') {
        await this.prisma.emailDomainReputation.update({
          where: { domainId },
          data: { tier: 'blocked' },
        }).catch(() => {});
        await this.eventService.emit('email.abuse.detected', projectId, {
          domainId,
          domain: domain.domain,
          type: 'complaint_spike',
          severity: 'critical',
          action: 'auto_blocked',
        }, {});
      }
    }
  }

  private async checkGrowthSpike(domainId: string, projectId: string): Promise<void> {
    // Baseline: average daily sends over last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
    const result = await this.prisma.emailApiUsage.aggregate({
      where: {
        apiKey: {
          project: { emailDomains: { some: { id: domainId } } },
        },
        date: { gte: sevenDaysAgo },
      },
      _sum: { sends: true },
      _count: { _all: true },
    });

    if (!result._count._all || result._count._all < 2) return; // need at least 2 days of data

    const avgDaily = (result._sum.sends ?? 0) / result._count._all;
    if (avgDaily < 10) return; // baseline too small to detect meaningful spikes

    // Today's sends for this domain
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySends = await this.prisma.emailApiUsage.aggregate({
      where: {
        apiKey: {
          project: { emailDomains: { some: { id: domainId } } },
        },
        date: { gte: today },
      },
      _sum: { sends: true },
    });

    const todayTotal = todaySends._sum.sends ?? 0;
    if (todayTotal > avgDaily * 5) {
      await this.recordAbuseEvent(domainId, projectId, 'sudden_growth', 'medium', {
        todaySends: todayTotal,
        avgDaily: Math.round(avgDaily),
        multipleOfBaseline: Math.round(todayTotal / avgDaily * 10) / 10,
      });
    }
  }

  private async recordAbuseEvent(
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

    await this.eventService.emit('email.abuse.detected', projectId, {
      domainId,
      type,
      severity,
      details,
    }, {});
  }
}
