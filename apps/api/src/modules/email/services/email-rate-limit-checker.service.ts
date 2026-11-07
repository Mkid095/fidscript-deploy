/**
 * Rate-limit checkers — one function per limit tier. Each returns a
 * `RateLimitCheckResult` that the orchestrator composes in order. Extracted
 * from EmailRateLimitService to keep that orchestration file under the
 * 150-line ANPAS limit.
 */
import { Injectable } from '@nestjs/common';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { EmailRateLimitStoreService } from './email-rate-limit-store.service';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  limit?: number;
  remaining?: number;
}

const IP_BURST_LIMIT = 50;
const IP_BURST_WINDOW_SEC = 60;
const PROJECT_DAILY_LIMIT = 50_000;

@Injectable()
export class EmailRateLimitCheckerService {
  constructor(
    private store: EmailRateLimitStoreService,
    private authLimiter: AuthRateLimiter,
  ) {}

  async checkIpBurst(ip: string): Promise<RateLimitCheckResult> {
    const result = await this.authLimiter.consume(
      `ratelimit:burst:ip:${ip}`,
      IP_BURST_LIMIT,
      IP_BURST_WINDOW_SEC,
    );
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'Too many requests from this IP address',
        retryAfterSeconds: result.retryAfter,
        limit: IP_BURST_LIMIT,
        remaining: 0,
      };
    }
    return { allowed: true, limit: IP_BURST_LIMIT, remaining: result.count < IP_BURST_LIMIT ? IP_BURST_LIMIT - result.count : 0 };
  }

  async checkApiKeyQuota(apiKeyId: string, projectId: string): Promise<RateLimitCheckResult> {
    const snap = await this.store.snapshotKeyQuota(apiKeyId, projectId);
    if (!snap.apiKey) return { allowed: false, reason: 'API key not found' };
    if (!snap.apiKey.scopes.includes('email.send')) {
      return { allowed: false, reason: 'API key does not have email.send scope' };
    }
    const dailyLimit = snap.apiKey.rateLimitPlan?.dailyLimit ?? 1000;
    const monthlyLimit = snap.apiKey.rateLimitPlan?.monthlyLimit ?? 30000;

    if (snap.currentDailySends >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily send limit reached (${snap.currentDailySends}/${dailyLimit})`,
        retryAfterSeconds: this.secondsUntilMidnight(),
        limit: dailyLimit, remaining: 0,
      };
    }
    if (snap.currentMonthSends >= monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly send limit reached (${snap.currentMonthSends}/${monthlyLimit})`,
        retryAfterSeconds: this.daysUntilMonthEnd() * 86400,
        limit: monthlyLimit, remaining: 0,
      };
    }
    if (snap.blockedUntil && snap.blockedUntil > new Date()) {
      const retryAfter = Math.ceil((snap.blockedUntil.getTime() - Date.now()) / 1000);
      return {
        allowed: false,
        reason: `Key temporarily blocked until ${snap.blockedUntil.toISOString()}`,
        retryAfterSeconds: retryAfter,
      };
    }
    return { allowed: true, limit: dailyLimit, remaining: Math.max(0, dailyLimit - snap.currentDailySends) };
  }

  async checkDomainLimit(apiKeyId: string, projectId: string, domain: string): Promise<RateLimitCheckResult> {
    const snap = await this.store.snapshotKeyQuota(apiKeyId, projectId);
    const planDomainLimits = snap.apiKey?.rateLimitPlan?.domainLimits ?? {};
    const limit = planDomainLimits[domain];
    if (!limit) return { allowed: true };

    const totalSends = await this.store.projectDailySendsForDomain(projectId);
    if (totalSends >= limit) {
      return {
        allowed: false,
        reason: `Domain daily limit reached for ${domain} (${totalSends}/${limit})`,
        retryAfterSeconds: this.secondsUntilMidnight(),
        limit, remaining: 0,
      };
    }
    return { allowed: true, limit, remaining: Math.max(0, limit - totalSends) };
  }

  async checkProjectQuota(projectId: string): Promise<RateLimitCheckResult> {
    const totalSends = await this.store.projectDailySends(projectId);
    if (totalSends >= PROJECT_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Project daily aggregate limit reached (${totalSends}/${PROJECT_DAILY_LIMIT})`,
        retryAfterSeconds: this.secondsUntilMidnight(),
        limit: PROJECT_DAILY_LIMIT, remaining: 0,
      };
    }
    return { allowed: true, limit: PROJECT_DAILY_LIMIT, remaining: PROJECT_DAILY_LIMIT - totalSends };
  }

  private secondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  }

  private daysUntilMonthEnd(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
  }
}
