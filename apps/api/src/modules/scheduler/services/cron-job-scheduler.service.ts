import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import * as cron from 'cron';
import { SchedulerQueueService } from './scheduler-queue.service';
import { RedisService } from '@/modules/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { SchedulerExecutionRequest } from './scheduler-queue.service';

/**
 * Liveness signal for the scheduler: a single TTL key in Redis, written on
 * every tick. Readers (the project-health report) treat a missing or stale
 * key as "the scheduler is not responding". One key, no records, no
 * evaluator — a heartbeat, not a monitoring system.
 */
export const SCHEDULER_HEARTBEAT_KEY = 'scheduler:heartbeat';
export const SCHEDULER_HEARTBEAT_STALE_MS = 3 * 60 * 1000;

@Injectable()
export class CronJobSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CronJobSchedulerService.name);
  private readonly runningJobs = new Map<string, cron.CronJob>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private schedulerQueueService: SchedulerQueueService,
    private redisService: RedisService,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  /**
   * Restore ALL active cron jobs from the database on application bootstrap.
   * This is the mandatory fix: without this, every API restart silently disables every schedule.
   */
  async onApplicationBootstrap() {
    console.log('[CronJobScheduler] onApplicationBootstrap START');
    try {
      const activeJobs = await this.prisma.cronJob.findMany({ where: { enabled: true } });
      console.log('[CronJobScheduler] found', activeJobs.length, 'active jobs');
      await Promise.allSettled(activeJobs.map(job => this.scheduleJob(job)));
      console.log('[CronJobScheduler] bootstrap complete');
    } catch (err) {
      console.error('[CronJobScheduler] bootstrap error:', err);
    }
    // The heartbeat starts even when no job is enabled: it says "the
    // scheduler is alive", which is the question the reader asks.
    this.beat();
    this.heartbeatTimer = setInterval(() => this.beat(), 60_000);
    this.heartbeatTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async beat() {
    try {
      // TTL outlives the staleness threshold so a late reader can still see
      // *when* the scheduler last spoke, instead of a bare absence.
      await this.redisService.set(SCHEDULER_HEARTBEAT_KEY, new Date().toISOString(), 300);
    } catch {
      // The store itself is down; the reader's ping() will say so.
    }
  }

  async scheduleJob(job: any) {
    if (this.runningJobs.has(job.id)) return;
    try {
      const cronJob = new cron.CronJob(
        job.cronExpression,
        async () => {
          const lockKey = `schedule:lock:${job.id}`;
          const lockToken = crypto.randomUUID();
          const acquired = await this.redisService.acquireLock(lockKey, lockToken, 5 * 60 * 1000);
          if (!acquired) {
            this.logger.debug(`[${job.name}] skipped — lock held by another process`);
            return;
          }
          try {
            const scheduledAt = new Date();
            // Idempotent run creation: skip if a run for this job + scheduledAt + attempt already exists.
            let run: { id: string };
            try {
              run = await this.prisma.cronJobRun.create({
                data: { cronJobId: job.id, status: 'running', attempt: 1, scheduledAt, executionReason: 'scheduled' },
              });
            } catch (err: any) {
              if (err.code === 'P2002') {
                // Structured dedup: emit an observable event instead of silent skip
                this.logger.warn(`[${job.name}] deduplicated run for scheduledAt=${scheduledAt.toISOString()}`);
                await this.eventService.emit('cron.job_run_deduplicated', job.projectId, {
                  jobId: job.id, scheduledAt: scheduledAt.toISOString(),
                  reason: 'scheduled_collision',
                });
                return;
              }
              throw err;
            }
            const request: SchedulerExecutionRequest = {
              runId: run.id,
              jobId: job.id,
              projectId: job.projectId,
              attempt: 1,
              scheduledAt: scheduledAt.toISOString(),
              payloadSnapshot: {
                type: job.functionId ? 'function' : 'endpoint',
                url: job.endpoint,
                method: 'POST',
                headers: {},
                body: job.payload ?? {},
                functionId: job.functionId,
              },
            };
            await this.schedulerQueueService.enqueue(request);
          } finally {
            await this.redisService.releaseLock(lockKey, lockToken);
          }
        },
        null, true, job.timezone,
      );
      this.runningJobs.set(job.id, cronJob);
      this.logger.debug(`Scheduled job "${job.name}" (${job.cronExpression}, ${job.timezone})`);
    } catch (error) {
      this.logger.error(`Failed to schedule job ${job.id}: ${(error as Error).message}`);
    }
  }

  unscheduleJob(jobId: string) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      job.stop();
      this.runningJobs.delete(jobId);
      this.logger.debug(`Unscheduled job ${jobId}`);
    }
  }
}
