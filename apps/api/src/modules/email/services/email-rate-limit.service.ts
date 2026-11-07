/**
 * Email rate limiter — facade. Composes the per-tier checkers in order
 * and returns the first failure.
 *
 * Split into:
 *   - EmailRateLimitStoreService — DB quota accounting
 *   - EmailRateLimitCheckerService — per-tier check functions
 *   - EmailRateLimitService (this) — orchestration (4 tiers, first fail wins)
 */
import { Injectable } from '@nestjs/common';
import { EmailRateLimitStoreService } from './email-rate-limit-store.service';
import { EmailRateLimitCheckerService, RateLimitCheckResult } from './email-rate-limit-checker.service';

export { RateLimitCheckResult } from './email-rate-limit-checker.service';

@Injectable()
export class EmailRateLimitService {
  constructor(
    private store: EmailRateLimitStoreService,
    private checker: EmailRateLimitCheckerService,
  ) {}

  /**
   * Full hierarchy check. Runs all limits in order; returns the first failure.
   * For passes, returns remaining quota info.
   */
  async checkAll(
    apiKeyId: string,
    projectId: string,
    domain: string,
    ipAddress: string,
  ): Promise<RateLimitCheckResult> {
    const ip = await this.checker.checkIpBurst(ipAddress);
    if (!ip.allowed) return ip;
    const key = await this.checker.checkApiKeyQuota(apiKeyId, projectId);
    if (!key.allowed) return key;
    const dom = await this.checker.checkDomainLimit(apiKeyId, projectId, domain);
    if (!dom.allowed) return dom;
    const proj = await this.checker.checkProjectQuota(projectId);
    if (!proj.allowed) return proj;
    return { allowed: true, remaining: 1 };
  }

  recordUsage(apiKeyId: string, projectId: string, domain: string): Promise<void> {
    return this.store.recordUsage(apiKeyId, projectId, domain);
  }
}
