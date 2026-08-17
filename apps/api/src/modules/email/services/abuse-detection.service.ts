/**
 * Abuse detection — detects spike patterns and auto-escalates reputation.
 *
 * Tracks rolling 1h/24h windows via Prisma aggregates:
 *   bounce_rate_1h > 10% → medium abuse event
 *   bounce_rate_1h > 25% → critical → auto-block tier
 *   complaint_rate_1h > 2% → high abuse event
 *   complaint_rate_1h > 5% → critical → auto-block tier
 *   sudden_growth: sends > 5x baseline → medium
 *
 * Split into:
 *   - AbuseDetectionStoreService — DB persistence + domain lookups
 *   - AbuseDetectionService (this) — spike detection logic
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { AbuseDetectionStoreService } from './abuse-detection-store.service';

@Injectable()
export class AbuseDetectionService {
  private readonly logger = new Logger(AbuseDetectionService.name);

  constructor(
    private store: AbuseDetectionStoreService,
    private events: EventService,
  ) {}

  async onBounce(domainId: string, projectId: string): Promise<void> {
    await this.checkBounceSpike(domainId, projectId);
  }

  async onComplaint(domainId: string, projectId: string): Promise<void> {
    await this.checkComplaintSpike(domainId, projectId);
  }

  async onSend(domainId: string, projectId: string): Promise<void> {
    await this.checkGrowthSpike(domainId, projectId);
  }

  private async checkBounceSpike(domainId: string, projectId: string): Promise<void> {
    const domain = await this.store.findDomain(domainId);
    if (!domain) return;

    const [bounces1h, totalSends1h] = await Promise.all([
      this.store.countBouncesSince(domainId, 3_600_000),
      this.store.countSendsSince(domainId, 3_600_000),
    ]);

    if (totalSends1h < 10) return;
    const bounceRate = bounces1h / totalSends1h * 100;
    let severity: string | null = null;
    if (bounceRate > 25) severity = 'critical';
    else if (bounceRate > 10) severity = 'high';

    if (!severity) return;

    await this.store.recordEvent(domainId, projectId, 'bounce_spike', severity, {
      bounceRate: Math.round(bounceRate * 100) / 100,
      bounces1h,
      totalSends1h,
    });

    if (severity === 'critical') {
      await this.store.autoBlockDomain(domainId);
      await this.events.emit('email.abuse.detected', projectId, {
        domainId, domain: domain.domain, type: 'bounce_spike',
        severity: 'critical', action: 'auto_blocked',
      }, {});
    }
  }

  private async checkComplaintSpike(domainId: string, projectId: string): Promise<void> {
    const domain = await this.store.findDomain(domainId);
    if (!domain) return;

    const [complaints1h, totalSends1h] = await Promise.all([
      this.store.countComplaintsSince(domainId, 3_600_000),
      this.store.countSendsSince(domainId, 3_600_000),
    ]);

    if (totalSends1h < 10) return;
    const complaintRate = complaints1h / totalSends1h * 100;
    let severity: string | null = null;
    if (complaintRate > 5) severity = 'critical';
    else if (complaintRate > 2) severity = 'high';

    if (!severity) return;

    await this.store.recordEvent(domainId, projectId, 'complaint_spike', severity, {
      complaintRate: Math.round(complaintRate * 100) / 100,
      complaints1h,
      totalSends1h,
    });

    if (severity === 'critical') {
      await this.store.autoBlockDomain(domainId);
      await this.events.emit('email.abuse.detected', projectId, {
        domainId, domain: domain.domain, type: 'complaint_spike',
        severity: 'critical', action: 'auto_blocked',
      }, {});
    }
  }

  private async checkGrowthSpike(domainId: string, projectId: string): Promise<void> {
    const baseline = await this.store.sevenDayAverageDailySends(domainId);
    if (!baseline || baseline.avg < 10) return;

    const todayTotal = await this.store.todaySends(domainId);
    if (todayTotal > baseline.avg * 5) {
      await this.store.recordEvent(domainId, projectId, 'sudden_growth', 'medium', {
        todaySends: todayTotal,
        avgDaily: Math.round(baseline.avg),
        multipleOfBaseline: Math.round((todayTotal / baseline.avg) * 10) / 10,
      });
    }
  }
}
