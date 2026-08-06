import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as cron from 'cron';

/**
 * Read-side queries for cron jobs: runs listing, stats, next-run preview,
 * expression simulation. Pure DB + cron-time math; no execution side effects.
 *
 * Split out from CronJobExecutionService so the execution file stays under
 * the ANPAS 150-line cap and each file has one clear responsibility.
 */
@Injectable()
export class CronJobQueryService {
  constructor(private prisma: PrismaService) {}

  async getCronJobRuns(projectId: string, jobId: string, limit = 50, cursor?: string, status?: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');

    const where: any = { cronJobId: jobId };
    if (status) where.status = status;

    const runs = await this.prisma.cronJobRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = runs.length > limit;
    const page = hasMore ? runs.slice(0, -1) : runs;
    const chronological = (page.reverse() as any[]).map((r: any) => ({
      ...r,
      durationMs: r.durationMs != null ? Number(r.durationMs) : undefined,
    }));
    return {
      runs: chronological,
      nextCursor: hasMore ? (chronological[chronological.length - 1]?.id ?? null) : null,
    };
  }

  async getCronJobStats(projectId: string, jobId: string, window = 50) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');

    const runs = await this.prisma.cronJobRun.findMany({
      where: { cronJobId: jobId },
      orderBy: { createdAt: 'desc' },
      take: window,
      select: { status: true, durationMs: true },
    });

    const total = runs.length;
    const completed = runs.filter(r => r.status === 'completed').length;
    const failed = runs.filter(r => r.status === 'failed').length;
    const durations = runs.filter(r => r.durationMs != null).map(r => Number(r.durationMs));
    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const sparkline = [...runs].reverse().slice(-10).map(r => ({
      status: r.status,
      durationMs: r.durationMs ? Number(r.durationMs) : null,
    }));

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : null,
      avgDurationMs,
      sparkline,
    };
  }

  async getCronJobNextRun(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      return { nextRunAt: (nextDate as any).toISO ? (nextDate as any).toISO() : null };
    } catch {
      return { nextRunAt: null };
    }
  }

  async simulateRuns(projectId: string, jobId: string, count = 5): Promise<{ scheduledAt: string }[]> {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    return this.simulateExpression(job.cronExpression, job.timezone, count);
  }

  async simulateExpression(expression: string, timezone = 'UTC', count = 5): Promise<{ scheduledAt: string }[]> {
    try {
      let iterator = new cron.CronTime(expression, timezone);
      const dates: { scheduledAt: string }[] = [];
      for (let i = 0; i < count; i++) {
        const next = iterator.sendAt();
        const iso = (next as any).toISO ? (next as any).toISO() : String(next);
        dates.push({ scheduledAt: iso });
        iterator = new cron.CronTime(expression, timezone, (next as any).toJSDate());
      }
      return dates;
    } catch {
      return [];
    }
  }
}