import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Hierarchical email rate limiting:
 *   1. Global IP burst   — Redis sliding window, ~50 req/min
 *   2. Project aggregate — DB sum of all keys in project
 *   3. API Key          — DB daily/monthly quota
 *   4. Domain           — DB per-domain limit
 *
 * Redis is used ONLY for burst/bulk protection (fail-open).
 * All quota accounting uses the DB (EmailApiUsage) for accuracy.
 */
@Injectable()
export class EmailRateLimitService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private authLimiter: AuthRateLimiter,
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
    // 1. Global IP burst protection
    const ipResult = await this.checkIpBurst(ipAddress);
    if (!ipResult.allowed) return ipResult;

    // 2. API Key quota (daily/monthly)
    const keyResult = await this.checkApiKeyQuota(apiKeyId, projectId);
    if (!keyResult.allowed) return keyResult;

    // 3. Domain limit
    const domainResult = await this.checkDomainLimit(apiKeyId, projectId, domain);
    if (!domainResult.allowed) return domainResult;

    // 4. Project aggregate
    const projectResult = await this.checkProjectQuota(projectId);
    if (!projectResult.allowed) return projectResult;

    return {
      allowed: true,
      remaining: 1, // conservative — caller uses DB for accurate counts
    };
  }

  /**
   * Increment usage AFTER a successful send.
   * Called in the same transaction as EmailMessage insert.
   */
  async recordUsage(
    apiKeyId: string,
    projectId: string,
    domain: string,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.emailApiUsage.upsert({
      where: {
        projectId_apiKeyId_date: { projectId, apiKeyId, date: today },
      },
      create: {
        projectId,
        apiKeyId,
        date: today,
        sends: 1,
        failures: 0,
        bounces: 0,
        dailyLimit: 1000,
        monthlyLimit: 30000,
      },
      update: {
        sends: { increment: 1 },
      },
    });
  }

  // ─── IP Burst (Redis) ────────────────────────────────────────────────────────

  private async checkIpBurst(ip: string): Promise<RateLimitCheckResult> {
    const result = await this.authLimiter.consume(`ratelimit:burst:ip:${ip}`, 50, 60);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'Too many requests from this IP address',
        retryAfterSeconds: result.retryAfter,
        limit: 50,
        remaining: 0,
      };
    }
    return { allowed: true, limit: 50, remaining: result.count < 50 ? 50 - result.count : 0 };
  }

  // ─── API Key Quota (DB) ─────────────────────────────────────────────────────

  private async checkApiKeyQuota(
    apiKeyId: string,
    projectId: string,
  ): Promise<RateLimitCheckResult> {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
      include: { rateLimitPlan: true },
    });
    if (!apiKey) {
      return { allowed: false, reason: 'API key not found' };
    }

    if (!apiKey.scopes?.includes('email.send')) {
      return { allowed: false, reason: 'API key does not have email.send scope' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const usage = await this.prisma.emailApiUsage.findFirst({
      where: { apiKeyId, projectId, date: { gte: startOfMonth } },
      orderBy: { date: 'desc' },
    });

    // Daily limit
    const dailyLimit = apiKey.rateLimitPlan?.dailyLimit ?? 1000;
    if (usage && usage.date >= today) {
      if (usage.sends >= dailyLimit) {
        return {
          allowed: false,
          reason: `Daily send limit reached (${usage.sends}/${dailyLimit})`,
          retryAfterSeconds: this.secondsUntilMidnight(),
          limit: dailyLimit,
          remaining: 0,
        };
      }
    }

    // Monthly limit
    const monthlyLimit = apiKey.rateLimitPlan?.monthlyLimit ?? 30000;
    if (usage) {
      // Sum all sends in the month
      const monthUsage = await this.prisma.emailApiUsage.aggregate({
        where: { apiKeyId, projectId, date: { gte: startOfMonth } },
        _sum: { sends: true },
      });
      const totalMonthSends = monthUsage._sum.sends ?? 0;
      if (totalMonthSends >= monthlyLimit) {
        const daysUntilMonthEnd = this.daysUntilMonthEnd();
        return {
          allowed: false,
          reason: `Monthly send limit reached (${totalMonthSends}/${monthlyLimit})`,
          retryAfterSeconds: daysUntilMonthEnd * 86400,
          limit: monthlyLimit,
          remaining: 0,
        };
      }
    }

    // BlockedUntil check
    if (usage?.blockedUntil && new Date(usage.blockedUntil) > new Date()) {
      const retryAfter = Math.ceil((new Date(usage.blockedUntil).getTime() - Date.now()) / 1000);
      return {
        allowed: false,
        reason: `Key temporarily blocked until ${usage.blockedUntil.toISOString()}`,
        retryAfterSeconds: retryAfter,
      };
    }

    const currentDaily = usage && usage.date >= today ? usage.sends : 0;
    return { allowed: true, limit: dailyLimit, remaining: Math.max(0, dailyLimit - currentDaily) };
  }

  // ─── Domain Limit (DB) ────────────────────────────────────────────────────────

  private async checkDomainLimit(
    apiKeyId: string,
    projectId: string,
    domain: string,
  ): Promise<RateLimitCheckResult> {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
      include: { rateLimitPlan: true },
    });
    if (!apiKey) return { allowed: true }; // already failed above

    const domainLimits = (apiKey.rateLimitPlan?.domainLimits ?? {}) as Record<string, number>;
    const limit = domainLimits[domain];
    if (!limit) return { allowed: true }; // no domain-specific limit

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sum sends to this domain across all keys in the project today
    const result = await this.prisma.emailApiUsage.aggregate({
      where: {
        projectId,
        date: { gte: today },
      },
      _sum: { sends: true },
    });

    const totalSends = result._sum.sends ?? 0;
    if (totalSends >= limit) {
      return {
        allowed: false,
        reason: `Domain daily limit reached for ${domain} (${totalSends}/${limit})`,
        retryAfterSeconds: this.secondsUntilMidnight(),
        limit,
        remaining: 0,
      };
    }

    return { allowed: true, limit, remaining: Math.max(0, limit - totalSends) };
  }

  // ─── Project Aggregate (DB) ──────────────────────────────────────────────────

  private async checkProjectQuota(projectId: string): Promise<RateLimitCheckResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.emailApiUsage.aggregate({
      where: { projectId, date: { gte: today } },
      _sum: { sends: true },
    });

    const PROJECT_DAILY_LIMIT = 50_000;
    const totalSends = result._sum.sends ?? 0;
    if (totalSends >= PROJECT_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Project daily aggregate limit reached (${totalSends}/${PROJECT_DAILY_LIMIT})`,
        retryAfterSeconds: this.secondsUntilMidnight(),
        limit: PROJECT_DAILY_LIMIT,
        remaining: 0,
      };
    }

    return { allowed: true, limit: PROJECT_DAILY_LIMIT, remaining: PROJECT_DAILY_LIMIT - totalSends };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
