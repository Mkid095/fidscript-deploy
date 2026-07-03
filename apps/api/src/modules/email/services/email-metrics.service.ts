/**
 * Email delivery observability — metrics, failure breakdowns, latency percentiles.
 *
 * Aggregates EmailMessage + EmailDeliveryAttempt data for dashboards.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EmailMetricsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Delivery overview for a project (optionally date-range filtered).
   */
  async getOverview(projectId: string, rangeDays = 30) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const messages = await this.prisma.emailMessage.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { status: true, createdAt: true },
    });

    const total = messages.length;
    const counts: Record<string, number> = {};
    for (const m of messages) {
      const s = String(m.status);
      counts[s] = (counts[s] ?? 0) + 1;
    }

    return {
      total,
      rangeDays,
      byStatus: {
        queued: counts['QUEUED'] ?? 0,
        processing: counts['PROCESSING'] ?? 0,
        sent: counts['SENT'] ?? 0,
        delivered: counts['DELIVERED'] ?? 0,
        opened: counts['OPENED'] ?? 0,
        clicked: counts['CLICKED'] ?? 0,
        bounced: counts['BOUNCED'] ?? 0,
        softBounce: counts['SOFT_BOUNCE'] ?? 0,
        dead: counts['DEAD'] ?? 0,
        failed: counts['FAILED'] ?? 0,
        received: counts['RECEIVED'] ?? 0,
      },
      deliveryRate: total > 0 ? ((counts['SENT'] ?? 0) + (counts['DELIVERED'] ?? 0) + (counts['OPENED'] ?? 0) + (counts['CLICKED'] ?? 0)) / total : 0,
      bounceRate: total > 0 ? (counts['BOUNCED'] ?? 0) / total : 0,
      openRate: total > 0 ? (counts['OPENED'] ?? 0) / total : 0,
      clickRate: total > 0 ? (counts['CLICKED'] ?? 0) / total : 0,
    };
  }

  /**
   * Failure breakdown by failure type.
   */
  async getFailureBreakdown(projectId: string, rangeDays = 30) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const attempts = await (this.prisma as any).emailDeliveryAttempt.findMany({
      where: {
        message: { projectId },
        createdAt: { gte: since },
        status: { in: ['bounced', 'soft_bounce', 'failed'] },
      },
      select: { failureType: true, durationMs: true },
    });

    const breakdown: Record<string, { count: number; totalDurationMs: number }> = {};
    for (const a of attempts) {
      const key = a.failureType ?? 'UNKNOWN';
      if (!breakdown[key]) breakdown[key] = { count: 0, totalDurationMs: 0 };
      breakdown[key].count++;
      breakdown[key].totalDurationMs += a.durationMs ?? 0;
    }

    return Object.entries(breakdown).map(([type, data]) => ({
      failureType: type,
      count: data.count,
      avgDurationMs: data.count > 0 ? Math.round(data.totalDurationMs / data.count) : 0,
    }));
  }

  /**
   * Delivery latency percentiles (p50, p95, p99).
   */
  async getLatencyPercentiles(projectId: string, rangeDays = 30) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const attempts = await (this.prisma as any).emailDeliveryAttempt.findMany({
      where: {
        message: { projectId },
        createdAt: { gte: since },
        status: 'sent',
      },
      select: { durationMs: true },
      orderBy: { durationMs: 'asc' },
    });

    if (!attempts.length) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const durations = attempts.map((a: any) => a.durationMs ?? 0).sort((a: number, b: number) => a - b);
    const percentile = (p: number) => durations[Math.floor(durations.length * p)] ?? 0;

    return {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      count: durations.length,
    };
  }

  /**
   * Time-series data for charts — sends per day.
   */
  async getSendTimeline(projectId: string, rangeDays = 30) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const messages = await this.prisma.emailMessage.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { status: true, createdAt: true },
    });

    // Group by day
    const byDay: Record<string, { sent: number; bounced: number; failed: number }> = {};
    for (const m of messages) {
      const day = m.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { sent: 0, bounced: 0, failed: 0 };
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(String(m.status))) byDay[day].sent++;
      else if (String(m.status) === 'BOUNCED') byDay[day].bounced++;
      else if (['FAILED', 'DEAD'].includes(String(m.status))) byDay[day].failed++;
    }

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({ date: day, ...counts }));
  }
}
