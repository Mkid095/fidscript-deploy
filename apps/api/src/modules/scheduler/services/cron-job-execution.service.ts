import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as cron from 'cron';

@Injectable()
export class CronJobExecutionService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async executeJob(job: any, overridePayload?: Record<string, unknown>) {
    const run = await this.prisma.cronJobRun.create({
      data: { cronJobId: job.id, status: 'running', startedAt: new Date() },
    });

    await this.eventService.emit('cron.job_run_started', { runId: run.id, jobId: job.id, projectId: job.projectId });

    try {
      const payload = overridePayload || job.payload;
      if (job.endpoint) {
        const response = await fetch(job.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      await this.eventService.emit('cron.job_run_completed', { runId: run.id, jobId: job.id, projectId: job.projectId });
      return { runId: run.id, status: 'completed' };
    } catch (error: any) {
      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: (error as Error).message },
      });
      await this.eventService.emit('cron.job_run_failed', { runId: run.id, jobId: job.id, projectId: job.projectId, error: (error as Error).message });
      return { runId: run.id, status: 'failed', error: (error as Error).message };
    }
  }

  async getCronJobRuns(projectId: string, jobId: string, limit = 50, cursor?: string, status?: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');

    const where: any = { cronJobId: jobId };
    if (status) where.status = status;

    const runs = await this.prisma.cronJobRun.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = runs.length > limit;
    if (hasMore) runs.pop();
    return { runs: runs.reverse(), nextCursor: hasMore ? runs[runs.length - 1]?.id : null };
  }

  async getCronJobNextRun(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      return { nextRunAt: (nextDate as any).toISOString() };
    } catch { return { nextRunAt: null }; }
  }
}
