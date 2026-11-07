import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { RedisService } from '@/modules/redis/redis.service';
import * as cron from 'cron';

/**
 * Drives the retry-with-exponential-backoff loop for a single cron job run.
 * Each attempt creates a new CronJobRun row (one row per attempt); the final
 * row's status reflects the terminal outcome (completed | failed).
 *
 * Split out from CronJobExecutionService to keep that file under the ANPAS
 * 150-line cap; the orchestration loop is independent of the action-specific
 * executors (function / http / email / queue) which are delegated.
 */
@Injectable()
export class CronJobRetryRunnerService {
  private readonly logger = new Logger(CronJobRetryRunnerService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private redisService: RedisService,
  ) {}

  /**
   * Execute up to retryAttempts with exponential backoff between failures.
   * Each iteration calls `executeOnce(attempt)`. Returns the terminal
   * status and run id of the final attempt.
   */
  async runWithRetry(
    job: any,
    overridePayload: Record<string, unknown> | undefined,
    executeOnce: (attempt: number) => Promise<{ status: 'completed' | 'failed'; error?: string; durationMs: number }>,
  ): Promise<{ runId: string; status: string }> {
    const maxAttempts = job.retryAttempts ?? 3;
    const baseDelayMs = job.retryDelaySeconds ? job.retryDelaySeconds * 1000 : 60_000;
    let attempt = 1;
    let lastError: string | undefined;

    let run = await this.prisma.cronJobRun.create({
      data: { cronJobId: job.id, status: 'running', attempt, scheduledAt: new Date(), executionReason: 'manual' },
    });
    await this.eventService.emit('cron.job_run_started', job.projectId, {
      runId: run.id, jobId: job.id, attempt,
    });

    while (attempt <= maxAttempts) {
      const result = await executeOnce(attempt);

      if (result.status === 'completed') {
        await this.finishRun(run.id, 'completed', undefined, result.durationMs);
        await this.eventService.emit('cron.job_run_completed', job.projectId, {
          runId: run.id, jobId: job.id, attempt, durationMs: result.durationMs,
        });
        return { runId: run.id, status: 'completed' };
      }

      lastError = result.error ?? 'Unknown error';
      this.logger.warn(`[${job.name}] attempt ${attempt}/${maxAttempts} failed: ${lastError}`);

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.debug(`[${job.name}] retrying in ${delayMs}ms (attempt ${attempt + 1})`);
        await this.sleep(delayMs);
      }

      attempt++;
      if (attempt <= maxAttempts) {
        run = await this.prisma.cronJobRun.create({
          data: { cronJobId: job.id, status: 'running', attempt, scheduledAt: new Date(), executionReason: 'retry' },
        });
        await this.eventService.emit('cron.job_run_started', job.projectId, {
          runId: run.id, jobId: job.id, attempt,
        });
      }
    }

    await this.finishRun(run.id, 'failed', lastError);
    await this.eventService.emit('cron.job_run_failed', job.projectId, {
      runId: run.id, jobId: job.id, attempt, error: lastError,
    });
    return { runId: run.id, status: 'failed' };
  }

  async finishRun(runId: string, status: 'completed' | 'failed', errorMessage?: string, durationMs?: number): Promise<void> {
    await this.prisma.cronJobRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: errorMessage ?? null,
        durationMs: durationMs != null ? BigInt(durationMs) : null,
      },
    });
  }

  /**
   * Update the cron job's lastRunAt/nextRunAt after a run.
   * Failure here is non-fatal — drift visible via next-run endpoint.
   */
  async updateJobTiming(job: any): Promise<void> {
    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      const nextRunAt = (nextDate as any).toISO ? (nextDate as any).toISO() : null;
      await this.prisma.cronJob.update({
        where: { id: job.id },
        data: { lastRunAt: new Date(), nextRunAt: nextRunAt ? new Date(nextRunAt) : null },
      });
    } catch {
      // Non-fatal
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}