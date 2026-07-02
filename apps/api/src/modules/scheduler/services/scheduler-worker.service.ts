import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'cron';
import { EventService } from '@/modules/events/event.service';
import { FunctionsService } from '@/modules/functions/functions.service';
import { SchedulerQueueService, SchedulerExecutionRequest } from './scheduler-queue.service';
import { PrismaService } from '@/prisma/prisma.service';

const SCHEDULER_STREAM = 'SCHEDULER';
const SCHEDULER_DURABLE = 'scheduler-worker';

@Injectable()
export class SchedulerWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerWorkerService.name);
  private running = false;
  private pullTask: Promise<void> | null = null;

  constructor(
    private readonly eventService: EventService,
    private readonly functionsService: FunctionsService,
    private readonly prisma: PrismaService,
    private readonly schedulerQueueService: SchedulerQueueService,
  ) {}

  async onModuleInit() {
    // Give SchedulerQueueService a moment to connect to NATS first
    await new Promise<void>(resolve => setTimeout(resolve, 2500));
    const nc = this.eventService.getNatsConnection();
    if (!nc) {
      this.logger.warn('NATS not connected — scheduler worker will not start');
      return;
    }
    this.running = true;
    this.pullTask = this.pullLoop();
    this.logger.log('SchedulerWorkerService started');
  }

  async onModuleDestroy() {
    this.running = false;
    this.logger.log('SchedulerWorkerService stopped');
  }

  private async pullLoop(): Promise<void> {
    while (this.running) {
      let consumer;
      try {
        consumer = await this.schedulerQueueService.getConsumer();
        if (!consumer) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      } catch {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      try {
        const batch = await consumer.fetch({ max_messages: 5, expires: 5000 });
        for (const msg of batch) {
          try {
            const req: SchedulerExecutionRequest = JSON.parse(
              msg.data instanceof Uint8Array
                ? new TextDecoder().decode(msg.data)
                : String(msg.data),
            );
            await this.handleRequest(req);
            msg.ack();
          } catch (err: unknown) {
            this.logger.error(`[scheduler] worker error: ${(err as Error).message}`);
            // nak without requeue for transient errors; dead-letter after max_deliver
            msg.nak();
          }
        }
      } catch (err: unknown) {
        if (this.running) {
          this.logger.warn(`[scheduler] pull loop error: ${(err as Error).message}, retrying in 5s`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
  }

  private async handleRequest(req: SchedulerExecutionRequest): Promise<void> {
    this.logger.debug(`[scheduler] worker processing run=${req.runId} job=${req.jobId} attempt=${req.attempt}`);

    // ── Lease recovery: reclaim any runs whose lease has expired ──────────────
    await this.recoverExpiredLeases();

    const job = await this.prisma.cronJob.findFirst({ where: { id: req.jobId } });
    if (!job) {
      this.logger.warn(`[scheduler] job ${req.jobId} not found, skipping run ${req.runId}`);
      return;
    }

    // ── Acquire lease: mark this run as actively being worked on ─────────────
    // If the run was already leased by a crashed worker, the update will succeed
    // because we set leaseUntil to a new value. This is safe because the
    // previous worker's lease is now considered expired.
    const heartbeatIntervalMs = 15_000; // 15s heartbeat
    const timeoutMs = (job.timeoutSeconds || 300) * 1_000;
    const leaseUntil = new Date(Date.now() + timeoutMs + 30_000); // timeout + 30s grace

    await this.prisma.cronJobRun.update({
      where: { id: req.runId },
      data: {
        status: 'running',
        leaseUntil,
        heartbeatAt: new Date(),
        executionReason: req.executionReason ?? 'scheduled',
      },
    }).catch(() => {
      // Run was already completed or recovered by another worker — abandon
      this.logger.debug(`[scheduler] run=${req.runId} already completed or recovered, skipping`);
    });

    // ── Start heartbeat loop ─────────────────────────────────────────────────
    // Background interval that renews the lease while execution is in progress.
    // Cleared on both success and failure to stop unnecessary DB writes.
    const heartbeatTimer = setInterval(async () => {
      try {
        await this.prisma.cronJobRun.update({
          where: { id: req.runId },
          data: { heartbeatAt: new Date(), leaseUntil },
        });
        this.logger.debug(`[scheduler] heartbeat run=${req.runId}`);
      } catch {
        // Run already completed — stop heartbeating
        clearInterval(heartbeatTimer);
      }
    }, heartbeatIntervalMs);

    // ── Update job state ─────────────────────────────────────────────────────
    await this.prisma.cronJob.update({ where: { id: req.jobId }, data: { state: 'running' } });

    // ── Execute ──────────────────────────────────────────────────────────────
    const start = Date.now();
    let success = false;
    let errorMsg: string | undefined;
    let failureType: string = 'system_error';

    try {
      if (req.payloadSnapshot.type === 'function') {
        ({ success, error: errorMsg, failureType } = await this.executeFunction(req));
      } else {
        ({ success, error: errorMsg, failureType } = await this.executeHttp(req));
      }
    } catch (err: unknown) {
      success = false;
      errorMsg = (err as Error).message ?? 'Unexpected error';
      failureType = 'system_error';
    }

    // ── Stop heartbeat and release lease ─────────────────────────────────────
    clearInterval(heartbeatTimer);

    const durationMs = Date.now() - start;
    const newState = success ? 'completed' : 'failed';

    await this.prisma.cronJobRun.update({
      where: { id: req.runId },
      data: {
        status: newState,
        completedAt: new Date(),
        durationMs: BigInt(durationMs),
        errorMessage: errorMsg ?? null,
        failureType: success ? null : failureType,
        payloadSnapshot: req.payloadSnapshot as any,
        leaseUntil: null,  // release lease
        heartbeatAt: null,
      },
    });

    // ── Update job state machine ──────────────────────────────────────────────
    const retryable = failureType !== 'invalid_payload';
    const willRetry = !success && req.attempt < (job.retryAttempts ?? 3) && retryable;
    if (!willRetry) {
      const nextRunAt = success ? this.computeNextRun(job.cronExpression, job.timezone) : job.nextRunAt;
      await this.prisma.cronJob.update({
        where: { id: req.jobId },
        data: { state: newState, lastRunAt: new Date(), nextRunAt },
      });
    }

    await this.eventService.emit(
      success ? 'cron.job_run_completed' : 'cron.job_run_failed',
      req.projectId,
      { runId: req.runId, jobId: req.jobId, attempt: req.attempt, durationMs, error: errorMsg, failureType },
    );

    // ── Retry: re-enqueue with exponential backoff ────────────────────────────
    if (willRetry) {
      const baseDelaySeconds = job.retryDelaySeconds ?? 60;
      const delaySeconds = baseDelaySeconds * Math.pow(2, req.attempt - 1);
      const retryReq: SchedulerExecutionRequest = {
        ...req,
        attempt: req.attempt + 1,
        payloadSnapshot: req.payloadSnapshot,
        executionReason: 'retry',
      };
      await this.schedulerQueueService.enqueue(retryReq, delaySeconds);
      this.logger.debug(
        `[scheduler] run=${req.runId} failed (attempt ${req.attempt}, type=${failureType}), re-enqueued as attempt ${retryReq.attempt} in ${delaySeconds}s`,
      );
    } else if (!success && !retryable) {
      this.logger.warn(`[scheduler] run=${req.runId} failed with non-retryable type=${failureType}, not re-enqueueing`);
    }
  }

  /**
   * Recover runs whose lease has expired without completing.
   * Runs a background check on every message to opportunistically reclaim orphaned work.
   */
  private async recoverExpiredLeases(): Promise<void> {
    const expiredRuns = await this.prisma.cronJobRun.findMany({
      where: {
        status: 'running',
        leaseUntil: { lt: new Date() },
      },
      take: 10,
    });

    if (expiredRuns.length === 0) return;

    this.logger.warn(`[scheduler] recovering ${expiredRuns.length} expired runs`);
    await this.eventService.emit('cron.job_run_leases_expired', 'system', {
      runIds: expiredRuns.map(r => r.id),
    });

    for (const run of expiredRuns) {
      // Re-enqueue with lease_recovery reason so it's distinguishable from fresh runs
      const recoveryReq: SchedulerExecutionRequest = {
        runId: run.id,
        jobId: run.cronJobId,
        projectId: '', // worker will look up job for projectId
        attempt: run.attempt,
        scheduledAt: run.scheduledAt.toISOString(),
        payloadSnapshot: (run.payloadSnapshot ?? {}) as any,
        executionReason: 'lease_recovery',
      };
      // Use a small delay so we don't flood the queue on restart
      await this.schedulerQueueService.enqueue(recoveryReq, 5);
      this.logger.debug(`[scheduler] recovered run=${run.id} from expired lease`);
    }
  }

  private async executeFunction(req: SchedulerExecutionRequest): Promise<{ success: boolean; error?: string; failureType: string }> {
    const timeoutMs = 300_000; // 5 min default
    try {
      const result = await Promise.race([
        this.functionsService.invokeFunction(
          req.projectId,
          req.payloadSnapshot.functionId!,
          { payload: JSON.stringify(req.payloadSnapshot.body ?? {}), sync: false },
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Function execution timed out after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
      if (result && !(result as any).success) {
        return { success: false, error: `function ${req.payloadSnapshot.functionId} failed: ${(result as any).error ?? 'unknown'}`, failureType: 'dependency_failure' };
      }
      return { success: true, error: undefined, failureType: 'none' };
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      const failureType = msg.includes('timed out') ? 'timeout' : msg.includes('not found') || msg.includes('invalid') ? 'invalid_payload' : 'dependency_failure';
      return { success: false, error: msg || 'Unknown function error', failureType };
    }
  }

  private async executeHttp(req: SchedulerExecutionRequest): Promise<{ success: boolean; error?: string; failureType: string }> {
    const timeoutMs = 300_000; // 5 min default
    const controller = new AbortController();
    const killTimer = setTimeout(() => controller.abort(), timeoutMs);

    const fetchPromise = fetch(req.payloadSnapshot.url!, {
      method: req.payloadSnapshot.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'fidscript-scheduler/1.0',
        'X-Cron-Run': 'true',
        ...(req.payloadSnapshot.headers ?? {}),
      },
      body: JSON.stringify(req.payloadSnapshot.body ?? {}),
      signal: controller.signal,
    }).then(response => {
      if (!response.ok) {
        const isClientError = response.status >= 400 && response.status < 500;
        throw Object.assign(new Error(`HTTP ${response.status}: ${response.statusText}`), {
          status: response.status,
          failureType: isClientError ? 'invalid_payload' : 'dependency_failure',
        });
      }
      return { success: true, error: undefined, failureType: 'none' };
    });

    try {
      clearTimeout(killTimer);
      return await fetchPromise;
    } catch (err: unknown) {
      const e = err as Error & { failureType?: string; name?: string };
      const failureType = e.name === 'AbortError' || (e.message ?? '').includes('timed out')
        ? 'timeout'
        : (e.failureType ?? 'network_error');
      return { success: false, error: e.message ?? 'Unknown HTTP error', failureType };
    } finally {
      clearTimeout(killTimer);
      controller.abort();
    }
  }

  private computeNextRun(expression: string, timezone: string): Date | null {
    try {
      const cronTime = new cron.CronTime(expression, timezone);
      const nextDate = cronTime.sendAt();
      return (nextDate as any).toISO ? new Date((nextDate as any).toISO()) : null;
    } catch {
      return null;
    }
  }
}
