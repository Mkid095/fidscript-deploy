/**
 * Email domain reputation service.
 *
 * Scoring: 100 - (bounceRate * 0.4) - (complaintRate * 0.6)
 * Bounce/complaint rates are calculated over the last 30 days.
 *
 * Tier enforcement: blocks or throttles sending based on reputation.
 *
 * Split into:
 *   - EmailReputationStoreService — DB persistence + tier computation
 *   - EmailReputationService (this) — check-then-allow decision
 */
import { Injectable } from '@nestjs/common';
import { EmailReputationStoreService } from './email-reputation-store.service';

export interface ReputationResult {
  allowed: boolean;
  reason?: string;
  tier?: string;
  delayMs?: number;
}

@Injectable()
export class EmailReputationService {
  constructor(private store: EmailReputationStoreService) {}

  /**
   * Check if sending is allowed for a domain before enqueueing.
   * Returns a delay for restricted tier (exponential backoff), or
   * rejects for blocked / emergency-stopped / quarantined-over-limit.
   */
  async checkDomain(domainId: string, projectId: string): Promise<ReputationResult> {
    let rep = await this.store.findForDomain(domainId);

    if (!rep) {
      await this.store.seedTrusted(domainId);
      return { allowed: true, tier: 'trusted' };
    }

    if (rep.emergencyStop) {
      return {
        allowed: false,
        reason: '451 4.7.1 Emergency stop active — contact support',
        tier: rep.tier,
      };
    }

    if (rep.tier === 'blocked' || rep.sendingPaused) {
      return {
        allowed: false,
        reason: '550 Sending suspended for this domain due to reputation',
        tier: rep.tier,
      };
    }

    if (rep.tier === 'quarantined') {
      const currentLimit = await this.store.getWarmupDailyLimit(domainId);
      if (currentLimit >= 10) {
        return {
          allowed: false,
          reason: 'Domain is in quarantine — sending limit reached for this hour',
          tier: 'quarantined',
          delayMs: 3_600_000,
        };
      }
      return { allowed: true, tier: 'quarantined' };
    }

    if (rep.tier === 'restricted') {
      const score = rep.reputationScore ?? 50;
      const delayMs = Math.max(5_000, (100 - score) * 500);
      return { allowed: true, tier: 'restricted', delayMs };
    }

    return { allowed: true, tier: rep.tier };
  }

  recordDelivery(domainId: string, projectId: string): Promise<void> {
    return this.store.recomputeAndPersist(domainId, projectId, { delivered: 1, bounced: 0, complained: 0 });
  }

  recordBounce(domainId: string, projectId: string): Promise<void> {
    return this.store.recomputeAndPersist(domainId, projectId, { delivered: 0, bounced: 1, complained: 0 });
  }

  recordComplaint(domainId: string, projectId: string): Promise<void> {
    return this.store.recomputeAndPersist(domainId, projectId, { delivered: 0, bounced: 0, complained: 1 });
  }

  emergencyStop(domainId: string, _projectId: string, enabled: boolean): Promise<void> {
    return this.store.setEmergencyStop(domainId, enabled);
  }
}
