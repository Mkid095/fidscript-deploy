import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * API key rate limit checking for email sending.
 */
@Injectable()
export class RateLimitService {
  constructor(private prisma: PrismaService) {}

  async checkCanSend(apiKeyId: string, projectId: string): Promise<{ allowed: boolean; reason?: string }> {
    const apiKey = await this.prisma.emailApiKey.findFirst({ where: { id: apiKeyId, projectId } });
    if (!apiKey) return { allowed: false, reason: 'API key not found' };

    if (!apiKey.scopes?.includes('email.send')) {
      return { allowed: false, reason: 'API key does not have email.send scope' };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const usage = await this.prisma.emailApiUsage.findFirst({
      where: { apiKeyId, projectId, date: { gte: startOfDay } },
    });

    if (usage?.blockedUntil && new Date(usage.blockedUntil) > new Date()) {
      return { allowed: false, reason: `Key temporarily blocked until ${usage.blockedUntil.toISOString()}` };
    }

    if (usage && usage.sends >= (usage.dailyLimit ?? 1000)) {
      return { allowed: false, reason: `Daily limit reached (${usage.sends}/${usage.dailyLimit ?? 1000})` };
    }

    return { allowed: true };
  }
}
