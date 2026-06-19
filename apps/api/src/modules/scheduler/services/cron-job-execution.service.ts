import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { FunctionsService } from '@/modules/functions/functions.service';
import * as cron from 'cron';

@Injectable()
export class CronJobExecutionService {
  private readonly logger = new Logger(CronJobExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private functionsService: FunctionsService,
  ) {}

  async executeJob(job: any, overridePayload?: Record<string, unknown>) {
    const run = await this.prisma.cronJobRun.create({
      data: { cronJobId: job.id, status: 'running', startedAt: new Date() },
    });

    await this.eventService.emit('cron.job_run_started', { runId: run.id, jobId: job.id, projectId: job.projectId });

    let result: { status: 'completed' | 'failed'; error?: string };

    try {
      const payload = overridePayload || job.payload;

      if (job.functionId) {
        // ── Function target ───────────────────────────────────────────────
        this.logger.debug(`[${job.name}] invoking function ${job.functionId}`);
        const fnResult = await this.functionsService.invokeFunction(job.projectId, job.functionId, {
          payload: JSON.stringify(payload),
          sync: false,
        });
        // invokeFunction returns { success, error } instead of throwing on a
        // sandbox/runtime failure — surface it so the run is recorded as failed,
        // not silently "completed" while the function actually errored.
        if (fnResult && !fnResult.success) {
          throw new Error(`function ${job.functionId} failed: ${fnResult.error ?? 'unknown error'}`);
        }
      } else if (job.endpoint) {
        // ── HTTP target ───────────────────────────────────────────────────
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), (job.timeoutSeconds || 300) * 1000);
        try {
          const response = await fetch(job.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } finally {
          clearTimeout(timer);
        }
      }

      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      await this.eventService.emit('cron.job_run_completed', { runId: run.id, jobId: job.id, projectId: job.projectId });
      result = { status: 'completed' };
    } catch (error: unknown) {
      const errMsg = (error as Error).message;
      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: errMsg },
      });
      await this.eventService.emit('cron.job_run_failed', {
        runId: run.id, jobId: job.id, projectId: job.projectId, error: errMsg,
      });
      result = { status: 'failed', error: errMsg };
    }

    // ── Update lastRunAt + nextRunAt ────────────────────────────────────
    await this.updateJobTiming(job);

    return { runId: run.id, ...result };
  }

  private async updateJobTiming(job: any): Promise<void> {
    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      // sendAt() returns a Luxon DateTime; .toISO() is available
      const nextRunAt = (nextDate as any).toISO ? (nextDate as any).toISO() : null;
      await this.prisma.cronJob.update({
        where: { id: job.id },
        data: { lastRunAt: new Date(), nextRunAt: nextRunAt ? new Date(nextRunAt) : null },
      });
    } catch {
      // Non-fatal: timing drift is visible in the next manual nextRunAt query
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
      // sendAt() returns Luxon DateTime — .toISO() is always present
      return { nextRunAt: (nextDate as any).toISO ? (nextDate as any).toISO() : null };
    } catch {
      return { nextRunAt: null };
    }
  }
}
