import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { FunctionsService } from '@/modules/functions/functions.service';
import { RedisService } from '@/modules/redis/redis.service';
import { CronJobActionExecutorService } from './cron-job-action-executor.service';
import { CronJobRetryRunnerService } from './cron-job-retry-runner.service';
import { CronJobQueryService } from './cron-job-query.service';

/**
 * Cron-job execution orchestrator. The actual retry/backoff loop lives in
 * CronJobRetryRunnerService; query/stat helpers live in CronJobQueryService;
 * action-type-specific runners (email, queue) live in CronJobActionExecutorService.
 *
 * This file owns only: lock acquisition, action dispatch, and the legacy
 * function/http executors (which have no external service dependency).
 */
@Injectable()
export class CronJobExecutionService {
  private readonly logger = new Logger(CronJobExecutionService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private functionsService: FunctionsService,
    private redisService: RedisService,
    private actionExecutor: CronJobActionExecutorService,
    private retryRunner: CronJobRetryRunnerService,
    private queryService: CronJobQueryService,
  ) {}

  /**
   * Execute a cron job with full retry/backoff support.
   * 1. Acquire overlap-prevention lock
   * 2. Hand off to retry runner (handles run records + retries)
   * 3. Release lock
   */
  async executeJob(job: any, overridePayload?: Record<string, unknown>): Promise<{ runId: string; status: string }> {
    const lockKey = `scheduler:lock:${job.id}`;
    const lockToken = crypto.randomUUID();
    const acquired = await this.redisService.acquireLock(
      lockKey, lockToken, (job.timeoutSeconds || 300) * 1000 + 30_000,
    );
    if (!acquired) {
      this.logger.warn(`[${job.name}] skipped — lock held by another process or execution in progress`);
      return { runId: '', status: 'skipped' };
    }

    try {
      const result = await this.retryRunner.runWithRetry(job, overridePayload, () =>
        this.executeOnce(job, overridePayload),
      );
      await this.retryRunner.updateJobTiming(job);
      return result;
    } finally {
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Single execution attempt — runs function, HTTP, email, or queue target.
   */
  private async executeOnce(
    job: any,
    overridePayload: Record<string, unknown> | undefined,
  ): Promise<{ status: 'completed' | 'failed'; error?: string; durationMs: number }> {
    const start = Date.now();
    const timeoutMs = (job.timeoutSeconds || 300) * 1000;

    let execResult: { success: boolean; error?: string };
    try {
      const actionType: string = job.actionType ?? this.inferActionType(job);
      if (actionType === 'function' && job.functionId) {
        execResult = await this.executeFunction(job, overridePayload);
      } else if (actionType === 'email' && job.emailConfig) {
        execResult = await this.executeEmail(job, overridePayload);
      } else if (actionType === 'queue' && job.queueConfig) {
        execResult = await this.executeQueue(job, overridePayload);
      } else if (actionType === 'http' && job.endpoint) {
        execResult = await this.executeHttp(job, overridePayload, timeoutMs);
      } else {
        execResult = { success: false, error: `No valid target configured for actionType='${actionType}'` };
      }
    } catch (err: unknown) {
      return { status: 'failed', error: (err as Error).message ?? 'Unexpected execution error', durationMs: Date.now() - start };
    }

    return {
      status: execResult.success ? 'completed' : 'failed',
      error: execResult.error,
      durationMs: Date.now() - start,
    };
  }

  /** Derive actionType from which config column is populated. */
  private inferActionType(job: any): 'function' | 'email' | 'queue' | 'http' {
    if (job.functionId) return 'function';
    if (job.emailConfig) return 'email';
    if (job.queueConfig) return 'queue';
    return 'http';
  }

  private async executeFunction(job: any, overridePayload?: Record<string, unknown>) {
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

  private executeEmail(job: any, overridePayload?: Record<string, unknown>) {
    return this.actionExecutor.executeEmail(job.projectId, job.emailConfig, overridePayload, job.payload);
  }

  private executeQueue(job: any, overridePayload?: Record<string, unknown>) {
    return this.actionExecutor.executeQueue(job.projectId, job.queueConfig, overridePayload, job.payload);
  }

  private async executeHttp(job: any, overridePayload: Record<string, unknown> | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(job.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'fidscript-scheduler/1.0', 'X-Cron-Run': 'true' },
        body: JSON.stringify(overridePayload || job.payload || {}),
        signal: controller.signal,
      });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return { success: true };
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return { success: false, error: `Request timed out after ${timeoutMs}ms` };
      return { success: false, error: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}
