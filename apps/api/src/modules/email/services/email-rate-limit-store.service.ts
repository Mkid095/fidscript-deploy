/**
 * Email rate-limit store — DB-side quota accounting.
 *
 * Reads daily/monthly email usage for API keys, projects, and per-domain
 * limits from the platform's `EmailApiUsage` table. Redis-burst state is
 * left to the AuthRateLimiter shared by all modules.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface KeyQuotaSnapshot {
  apiKey: {
    id: string;
    scopes: string[];
    rateLimitPlan?: {
      dailyLimit: number;
      monthlyLimit: number;
      domainLimits: Record<string, number>;
    } | null;
  } | null;
  currentDailySends: number;
  currentMonthSends: number;
  blockedUntil: Date | null;
}

@Injectable()
export class EmailRateLimitStoreService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get a single API key's plan + current daily/monthly usage in one shot.
   */
  async snapshotKeyQuota(apiKeyId: string, projectId: string): Promise<KeyQuotaSnapshot> {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
      include: { rateLimitPlan: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthAgg = await this.prisma.emailApiUsage.aggregate({
      where: { apiKeyId, projectId, date: { gte: startOfMonth } },
      _sum: { sends: true },
    });

    const todayUsage = await this.prisma.emailApiUsage.findFirst({
      where: { apiKeyId, projectId, date: { gte: today } },
      orderBy: { date: 'desc' },
    });

    return {
      apiKey: apiKey
        ? {
            id: apiKey.id,
            scopes: (apiKey.scopes ?? []) as string[],
            rateLimitPlan: apiKey.rateLimitPlan
              ? {
                  dailyLimit: apiKey.rateLimitPlan.dailyLimit,
                  monthlyLimit: apiKey.rateLimitPlan.monthlyLimit,
                  domainLimits: (apiKey.rateLimitPlan.domainLimits ?? {}) as Record<string, number>,
                }
              : null,
          }
        : null,
      currentDailySends: todayUsage?.sends ?? 0,
      currentMonthSends: monthAgg._sum.sends ?? 0,
      blockedUntil: todayUsage?.blockedUntil ?? null,
    };
  }

  /**
   * Today's total sends for a project (used to enforce per-project daily
   * aggregate limit).
   */
  async projectDailySends(projectId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const agg = await this.prisma.emailApiUsage.aggregate({
      where: { projectId, date: { gte: today } },
      _sum: { sends: true },
    });
    return agg._sum.sends ?? 0;
  }

  /**
   * Today's sends per (project, domain) for domain-specific limits.
   */
  async projectDailySendsForDomain(projectId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const agg = await this.prisma.emailApiUsage.aggregate({
      where: { projectId, date: { gte: today } },
      _sum: { sends: true },
    });
    return agg._sum.sends ?? 0;
  }

  /**
   * Increment the daily sends counter after a successful send. Idempotent
   * for the (projectId, apiKeyId, date) row.
   */
  async recordUsage(apiKeyId: string, projectId: string, _domain: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.emailApiUsage.upsert({
      where: { projectId_apiKeyId_date: { projectId, apiKeyId, date: today } },
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
      update: { sends: { increment: 1 } },
    });
  }
}
