import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

export interface ReputationResult {
  allowed: boolean;
  reason?: string;
  tier?: string;
  delayMs?: number;
}

type ReputationTier = 'trusted' | 'moderate' | 'restricted' | 'blocked' | 'quarantined';

const TIER_THRESHOLDS = {
  trusted:     { scoreMin: 80,  bounceMax: 5,    complaintMax: 0.1  },
  moderate:    { scoreMin: 60,  bounceMax: null, complaintMax: null },
  restricted:  { scoreMin: 30,  bounceMax: 10,   complaintMax: null },
  blocked:     { scoreMin: 0,   bounceMax: null,  complaintMax: null },
  quarantined: { scoreMin: 0,   bounceMax: null,  complaintMax: null },
};

/**
 * Email domain reputation service.
 *
 * Scoring: 100 - (bounceRate * 40) - (complaintRate * 60)
 * Bounce/complaint rates are calculated over the last 30 days.
 *
 * Tier enforcement: blocks or throttles sending based on reputation.
 */
@Injectable()
export class EmailReputationService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  /**
   * Check if sending is allowed for a domain before enqueueing.
   * Returns a delay for restricted tier (exponential backoff), or throws for blocked.
   */
  async checkDomain(domainId: string, projectId: string): Promise<ReputationResult> {
    const rep = await this.prisma.emailDomainReputation.findUnique({
      where: { domainId },
    });

    // Auto-create with trusted score if not exists
    if (!rep) {
      await this.prisma.emailDomainReputation.create({
        data: { domainId, reputationScore: 100, tier: 'trusted' },
      });
      return { allowed: true, tier: 'trusted' };
    }

    // Emergency kill switch — reject everything
    if (rep.emergencyStop) {
      return {
        allowed: false,
        reason: '451 4.7.1 Emergency stop active — contact support',
        tier: rep.tier,
      };
    }

    // Blocked — hard reject
    if (rep.tier === 'blocked' || rep.sendingPaused) {
      return {
        allowed: false,
        reason: '550 Sending suspended for this domain due to reputation',
        tier: rep.tier,
      };
    }

    // Quarantined — allow 10/hour max, queue rest
    if (rep.tier === 'quarantined') {
      const warmup = await this.prisma.emailWarmup.findUnique({ where: { domainId } });
      const currentLimit = warmup?.currentDailyLimit ?? 0;
      if (currentLimit >= 10) {
        return {
          allowed: false,
          reason: 'Domain is in quarantine — sending limit reached for this hour',
          tier: 'quarantined',
          delayMs: 3_600_000, // retry in 1 hour
        };
      }
      return { allowed: true, tier: 'quarantined' };
    }

    // Restricted — exponential delay
    if (rep.tier === 'restricted') {
      const score = rep.reputationScore ?? 50;
      const delayMs = Math.max(5_000, (100 - score) * 500); // 5s at 90 score → 5s at 90 score
      return { allowed: true, tier: 'restricted', delayMs };
    }

    return { allowed: true, tier: rep.tier };
  }

  /**
   * Update reputation scores after a delivery event.
   * Called by the send worker on SENT/DELIVERED events.
   */
  async recordDelivery(domainId: string, projectId: string): Promise<void> {
    await this.updateScores(domainId, projectId, {
      delivered: 1,
      bounced: 0,
      complained: 0,
    });
  }

  /**
   * Update reputation scores after a bounce event.
   * Called by BounceParserService.
   */
  async recordBounce(domainId: string, projectId: string): Promise<void> {
    await this.updateScores(domainId, projectId, {
      delivered: 0,
      bounced: 1,
      complained: 0,
    });
  }

  /**
   * Update reputation scores after a complaint event.
   * Called by BounceHandlerService.
   */
  async recordComplaint(domainId: string, projectId: string): Promise<void> {
    await this.updateScores(domainId, projectId, {
      delivered: 0,
      bounced: 0,
      complained: 1,
    });
  }

  /**
   * Recalculate and persist reputation scores for a domain.
   */
  private async updateScores(
    domainId: string,
    projectId: string,
    delta: { delivered: number; bounced: number; complained: number },
  ): Promise<void> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    // Get domain info
    const domain = await this.prisma.emailDomain.findUnique({ where: { id: domainId } });
    if (!domain) return;

    // Count deliveries in last 30 days
    const deliveryCount = await this.prisma.emailDeliveryAttempt.count({
      where: {
        message: { senderIdentity: { domainId } },
        status: { in: ['sent', 'delivered'] },
      },
    });

    // Count bounces/complaints in last 30 days
    const bounceCount = await this.prisma.emailDeliveryAttempt.count({
      where: {
        message: { senderIdentity: { domainId } },
        status: { in: ['bounced'] },
        createdAt: { gte: since },
      },
    });

    const complaintCount = await this.prisma.emailSuppression.count({
      where: {
        domainId,
        reason: 'COMPLAINT',
        createdAt: { gte: since },
      },
    });

    const total = deliveryCount + bounceCount + delta.delivered;
    if (total === 0) return;

    const bounceRate = (bounceCount + delta.bounced) / total * 100;
    const complaintRate = (complaintCount + delta.complained) / total * 100;
    const deliveryRate = (deliveryCount + delta.delivered) / total * 100;
    const engagementRate = 0; // TODO: tracked via open/click events later

    const reputationScore = Math.max(0,
      100 - (bounceRate * 0.4) - (complaintRate * 0.6),
    );

    // Determine tier from score
    const tier = this.computeTier(reputationScore, bounceRate, complaintRate);

    const existing = await this.prisma.emailDomainReputation.findUnique({ where: { domainId } });
    const previousTier = existing?.tier;

    await this.prisma.emailDomainReputation.upsert({
      where: { domainId },
      create: {
        domainId,
        bounceRate,
        complaintRate,
        deliveryRate,
        engagementRate,
        reputationScore,
        tier,
      },
      update: {
        bounceRate,
        complaintRate,
        deliveryRate,
        engagementRate,
        reputationScore,
        tier,
      },
    });

    // Emit events on tier change
    if (previousTier && previousTier !== tier) {
      if (tier === 'blocked' || tier === 'quarantined') {
        await this.eventService.emit('email.reputation.suspended', projectId, {
          domainId,
          domain: domain.domain,
          previousTier,
          newTier: tier,
          reputationScore,
        }, {});
      } else {
        await this.eventService.emit('email.reputation.degraded', projectId, {
          domainId,
          domain: domain.domain,
          previousTier,
          newTier: tier,
          reputationScore,
        }, {});
      }
    } else {
      await this.eventService.emit('email.reputation.updated', projectId, {
        domainId,
        domain: domain.domain,
        tier,
        reputationScore,
        bounceRate,
        complaintRate,
      }, {});
    }
  }

  private computeTier(score: number, bounceRate: number, complaintRate: number): ReputationTier {
    if (score >= TIER_THRESHOLDS.trusted.scoreMin && bounceRate < TIER_THRESHOLDS.trusted.bounceMax && complaintRate < TIER_THRESHOLDS.trusted.complaintMax) return 'trusted';
    if (score >= TIER_THRESHOLDS.moderate.scoreMin) return 'moderate';
    if (score >= TIER_THRESHOLDS.restricted.scoreMin || bounceRate >= 5) return 'restricted';
    return 'blocked';
  }

  /**
   * Emergency stop — kill switch for a domain.
   */
  async emergencyStop(domainId: string, projectId: string, enabled: boolean): Promise<void> {
    await this.prisma.emailDomainReputation.update({
      where: { domainId },
      data: { emergencyStop: enabled },
    });
  }
}
