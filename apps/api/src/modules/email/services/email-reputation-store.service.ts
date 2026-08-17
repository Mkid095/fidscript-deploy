/**
 * Email reputation persistence — encapsulates all DB operations against
 * `emailDomainReputation` and the supporting `emailDeliveryAttempt` /
 * `emailSuppression` tables used to compute scores.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

export type ReputationTier = 'trusted' | 'moderate' | 'restricted' | 'blocked' | 'quarantined';

export interface ReputationRow {
  id?: string;
  domainId: string;
  reputationScore: number;
  tier: string;
  emergencyStop: boolean;
  sendingPaused: boolean;
  bounceRate: number;
  complaintRate: number;
  deliveryRate: number;
  engagementRate: number;
  updatedAt?: Date;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

@Injectable()
export class EmailReputationStoreService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  /** Read the existing reputation row, or null if none. */
  async findForDomain(domainId: string): Promise<ReputationRow | null> {
    return this.prisma.emailDomainReputation.findUnique({ where: { domainId } });
  }

  /** Create a fresh reputation row at the "trusted / 100" default. */
  async seedTrusted(domainId: string): Promise<void> {
    await this.prisma.emailDomainReputation.create({
      data: { domainId, reputationScore: 100, tier: 'trusted' },
    });
  }

  /** Flip the kill switch. */
  async setEmergencyStop(domainId: string, enabled: boolean): Promise<void> {
    await this.prisma.emailDomainReputation.update({
      where: { domainId },
      data: { emergencyStop: enabled },
    });
  }

  /** Get the warmup row (daily-limit ramp for new domains). */
  async getWarmupDailyLimit(domainId: string): Promise<number> {
    const row = await this.prisma.emailWarmup.findUnique({ where: { domainId } });
    return row?.currentDailyLimit ?? 0;
  }

  /**
   * Recompute reputation scores and persist. Emits the appropriate tier
   * change or update event.
   */
  async recomputeAndPersist(
    domainId: string,
    projectId: string,
    delta: { delivered: number; bounced: number; complained: number },
  ): Promise<void> {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const domain = await this.prisma.emailDomain.findUnique({ where: { id: domainId } });
    if (!domain) return;

    const [deliveryCount, bounceCount, complaintCount] = await Promise.all([
      this.prisma.emailDeliveryAttempt.count({
        where: { message: { senderIdentity: { domainId } }, status: { in: ['sent', 'delivered'] } },
      }),
      this.prisma.emailDeliveryAttempt.count({
        where: {
          message: { senderIdentity: { domainId } },
          status: { in: ['bounced'] },
          createdAt: { gte: since },
        },
      }),
      this.prisma.emailSuppression.count({
        where: { domainId, reason: 'COMPLAINT', createdAt: { gte: since } },
      }),
    ]);

    const total = deliveryCount + bounceCount + delta.delivered;
    if (total === 0) return;

    const bounceRate = (bounceCount + delta.bounced) / total * 100;
    const complaintRate = (complaintCount + delta.complained) / total * 100;
    const deliveryRate = (deliveryCount + delta.delivered) / total * 100;
    const engagementRate = 0;

    const reputationScore = Math.max(0, 100 - (bounceRate * 0.4) - (complaintRate * 0.6));
    const tier = this.computeTier(reputationScore, bounceRate, complaintRate);

    const existing = await this.findForDomain(domainId);
    const previousTier = existing?.tier;

    await this.prisma.emailDomainReputation.upsert({
      where: { domainId },
      create: {
        domainId, bounceRate, complaintRate, deliveryRate, engagementRate,
        reputationScore, tier,
      },
      update: {
        bounceRate, complaintRate, deliveryRate, engagementRate,
        reputationScore, tier,
      },
    });

    if (previousTier && previousTier !== tier) {
      if (tier === 'blocked' || tier === 'quarantined') {
        await this.events.emit('email.reputation.suspended', projectId, {
          domainId, domain: domain.domain, previousTier, newTier: tier, reputationScore,
        }, {});
      } else {
        await this.events.emit('email.reputation.degraded', projectId, {
          domainId, domain: domain.domain, previousTier, newTier: tier, reputationScore,
        }, {});
      }
    } else {
      await this.events.emit('email.reputation.updated', projectId, {
        domainId, domain: domain.domain, tier, reputationScore, bounceRate, complaintRate,
      }, {});
    }
  }

  private computeTier(score: number, bounceRate: number, complaintRate: number): ReputationTier {
    if (score >= 80 && bounceRate < 5 && complaintRate < 0.1) return 'trusted';
    if (score >= 60) return 'moderate';
    if (score >= 30 || bounceRate >= 5) return 'restricted';
    return 'blocked';
  }
}
