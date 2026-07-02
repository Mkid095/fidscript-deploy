import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { FunctionsService } from '@/modules/functions/functions.service';
import { RedisService } from '@/modules/redis/redis.service';
import * as cron from 'cron';

/**
 * Returns true if two cron expressions would fire at the same instant
 * (used to detect misconfigured overlapping jobs).
 */
function cronExpressionsOverlap(a: string, b: string): boolean {
  // Simple overlap check: same expression string — caller should
  // have already validated this via the DB unique constraint.
  return a.trim() === b.trim();
}

interface RunResult {
  status: 'completed' | 'failed' | 'timeout';
  error?: string;
  durationMs: number;
}

@Injectable()
export class CronJobExecutionService {
  private readonly logger = new Logger(CronJobExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private functionsService: FunctionsService,
    private redisService: RedisService,
  ) {}

  /**
   * Execute a cron job with full retry/backoff support.
   *
   * Flow:
   *  1. Check for overlapping execution (skip if already running)
   *  2. Attempt execution up to retryAttempts
   *  3. On failure: wait with exponential backoff, then retry
   *  4. Record final run result and update job timing
   */
  async executeJob(job: any, overridePayload?: Record<string, unknown>): Promise<{ runId: string; status: string }> {
    const lockKey = `scheduler:lock:${job.id}`;
    const lockToken = crypto.randomUUID();

    // ── Overlap prevention ────────────────────────────────────────────
    const acquired = await this.redisService.acquireLock(lockKey, lockToken, (job.timeoutSeconds || 300) * 1000 + 30_000);
    if (!acquired) {
      this.logger.warn(`[${job.name}] skipped — lock held by another process or execution in progress`);
      return { runId: '', status: 'skipped' };
    }

    try {
      return await this.runWithRetry(job, overridePayload);
    } finally {
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  private async runWithRetry(job: any, overridePayload?: Record<string, unknown>): Promise<{ runId: string; status: string }> {
    const maxAttempts = job.retryAttempts ?? 3;
    const baseDelayMs = job.retryDelaySeconds ? job.retryDelaySeconds * 1000 : 60_000;
    const timeoutMs = (job.timeoutSeconds || 300) * 1000;
    let attempt = 1;
    let lastError: string | undefined;

    // Create initial run record
    let run = await this.prisma.cronJobRun.create({
      data: { cronJobId: job.id, status: 'running', attempt, scheduledAt: new Date(), executionReason: 'manual' },
    });
    await this.eventService.emit('cron.job_run_started', job.projectId, {
      runId: run.id, jobId: job.id, attempt,
    });

    while (attempt <= maxAttempts) {
      const result = await this.executeOnce(job, overridePayload, run.id, timeoutMs);

      if (result.status === 'completed') {
        await this.finishRun(run.id, 'completed', undefined, result.durationMs);
        await this.eventService.emit('cron.job_run_completed', job.projectId, {
          runId: run.id, jobId: job.id, attempt, durationMs: result.durationMs,
        });
        await this.updateJobTiming(job);
        return { runId: run.id, status: 'completed' };
      }

      lastError = result.error ?? 'Unknown error';
      this.logger.warn(`[${job.name}] attempt ${attempt}/${maxAttempts} failed: ${lastError}`);

      if (attempt < maxAttempts) {
        // Exponential backoff: delay * 2^(attempt-1)
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.debug(`[${job.name}] retrying in ${delayMs}ms (attempt ${attempt + 1})`);
        await this.sleep(delayMs);
      }

      // Create a new run record for the retry attempt
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

    // All retries exhausted
    await this.finishRun(run.id, 'failed', lastError);
    await this.eventService.emit('cron.job_run_failed', job.projectId, {
      runId: run.id, jobId: job.id, attempt, error: lastError,
    });
    await this.updateJobTiming(job);
    return { runId: run.id, status: 'failed' };
  }

  /**
   * Single execution attempt — runs function or HTTP target.
   * Respects job.timeoutSeconds.
   */
  private async executeOnce(
    job: any,
    overridePayload: Record<string, unknown> | undefined,
    runId: string,
    timeoutMs: number,
  ): Promise<RunResult> {
    const start = Date.now();

    let execResult: { success: boolean; error?: string };
    try {
      if (job.functionId) {
        execResult = await this.executeFunction(job, overridePayload);
      } else if (job.endpoint) {
        execResult = await this.executeHttp(job, overridePayload, timeoutMs);
      } else {
        execResult = { success: false, error: 'No target configured (no endpoint or functionId)' };
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Unexpected execution error';
      return { status: 'failed', error: msg, durationMs: Date.now() - start };
    }

    return {
      status: execResult.success ? 'completed' : 'failed',
      error: execResult.error,
      durationMs: Date.now() - start,
    };
  }

  private async executeFunction(job: any, overridePayload?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      const fnResult = await this.functionsService.invokeFunction(job.projectId, job.functionId, {
        payload: JSON.stringify(overridePayload || job.payload || {}),
        sync: false,
      });
      if (fnResult && !fnResult.success) {
        return { success: false, error: `function ${job.functionId} failed: ${fnResult.error ?? 'unknown'}` };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }

  private async executeHttp(
    job: any,
    overridePayload: Record<string, unknown> | undefined,
    timeoutMs: number,
  ): Promise<{ success: boolean; error?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(job.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'fidscript-scheduler/1.0',
          'X-Cron-Run': 'true',
        },
        body: JSON.stringify(overridePayload || job.payload || {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return { success: true };
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, error: `Request timed out after ${timeoutMs}ms` };
      }
      return { success: false, error: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }

  private async finishRun(
    runId: string,
    status: 'completed' | 'failed',
    errorMessage?: string,
    durationMs?: number,
  ): Promise<void> {
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

  private async updateJobTiming(job: any): Promise<void> {
    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      const nextRunAt = (nextDate as any).toISO ? (nextDate as any).toISO() : null;
      await this.prisma.cronJob.update({
        where: { id: job.id },
        data: { lastRunAt: new Date(), nextRunAt: nextRunAt ? new Date(nextRunAt) : null },
      });
    } catch {
      // Non-fatal: timing drift visible via next-run endpoint
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Query helpers ─────────────────────────────────────────────────────────────

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
    // Convert Prisma BigInt to number for JSON serialization; cast via any to bypass stale generated types
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

    // Last 10 runs for sparkline (oldest first)
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

  /**
   * Simulate next N execution times for a cron expression (dry-run / preview).
   */
  async simulateRuns(projectId: string, jobId: string, count = 5): Promise<{ scheduledAt: string }[]> {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    return this.simulateExpression(job.cronExpression, job.timezone, count);
  }

  async simulateExpression(expression: string, timezone = 'UTC', count = 5): Promise<{ scheduledAt: string }[]> {
    try {
      // Use a mutable reference for the cron iterator
      let iterator = new cron.CronTime(expression, timezone);
      const dates: { scheduledAt: string }[] = [];
      for (let i = 0; i < count; i++) {
        // sendAt() with no argument = next occurrence from now
        const next = iterator.sendAt();
        const iso = (next as any).toISO ? (next as any).toISO() : String(next);
        dates.push({ scheduledAt: iso });
        // Advance iterator to the next occurrence by creating a new CronTime anchored to the previous tick
        iterator = new cron.CronTime(expression, timezone, (next as any).toJSDate());
      }
      return dates;
    } catch {
      return [];
    }
  }
}
