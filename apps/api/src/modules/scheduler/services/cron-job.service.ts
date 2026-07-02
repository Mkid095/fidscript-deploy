import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CronJobSchedulerService } from './cron-job-scheduler.service';
import { SchedulerQueueService, SchedulerExecutionRequest } from './scheduler-queue.service';
import * as cron from 'cron';

function computeNextRunAt(expression: string, timezone: string): Date | null {
  try {
    const cronTime = new cron.CronTime(expression, timezone);
    const nextDate = cronTime.sendAt();
    const iso: string | null = (nextDate as any).toISO ? (nextDate as any).toISO() : null;
    return iso ? new Date(iso) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class CronJobService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private scheduler: CronJobSchedulerService,
    private schedulerQueueService: SchedulerQueueService,
  ) {}

  async createCronJob(projectId: string, dto: any) {
    try { new cron.CronTime(dto.cronExpression); } catch { throw new Error('Invalid cron expression'); }
    const nextRunAt = computeNextRunAt(dto.cronExpression, dto.timezone || 'UTC');

    const job = await this.prisma.cronJob.create({
      data: {
        projectId, name: dto.name, cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC', endpoint: dto.endpoint, functionId: dto.functionId,
        payload: (dto.payload || {}) as any, enabled: dto.enabled ?? true,
        retryAttempts: dto.retryAttempts || 3, retryDelaySeconds: dto.retryDelaySeconds || 60,
        timeoutSeconds: dto.timeoutSeconds || 300, nextRunAt,
        state: 'scheduled',
      },
    });

    await this.eventService.emit('cron.job_created', projectId, { jobId: job.id, name: dto.name });
    if (job.enabled) await this.scheduler.scheduleJob(job);
    return this.withTargetType(job);
  }

  async listCronJobs(projectId: string) {
    const jobs = await this.prisma.cronJob.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    return jobs.map(j => this.withTargetType(j));
  }

  async getCronJob(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    return this.withTargetType(job);
  }

  /** Derive targetType from endpoint/functionId and attach as a virtual field. */
  private withTargetType(job: any) {
    return {
      ...job,
      targetType: job.functionId ? 'function' : 'endpoint',
    };
  }

  async updateCronJob(projectId: string, jobId: string, dto: any) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    if (dto.cronExpression) { try { new cron.CronTime(dto.cronExpression); } catch { throw new Error('Invalid cron expression'); } }

    this.scheduler.unscheduleJob(jobId);
    const newExpression = dto.cronExpression ?? job.cronExpression;
    const newTimezone = dto.timezone ?? job.timezone;
    const nextRunAt = dto.cronExpression || dto.timezone
      ? computeNextRunAt(newExpression, newTimezone)
      : undefined;

    const updated = await this.prisma.cronJob.update({
      where: { id: jobId },
      data: {
        name: dto.name ?? job.name, cronExpression: newExpression,
        timezone: newTimezone, endpoint: dto.endpoint ?? job.endpoint,
        functionId: dto.functionId ?? job.functionId, payload: (dto.payload ?? job.payload) as any,
        enabled: dto.enabled ?? job.enabled, retryAttempts: dto.retryAttempts ?? job.retryAttempts,
        retryDelaySeconds: dto.retryDelaySeconds ?? job.retryDelaySeconds,
        timeoutSeconds: dto.timeoutSeconds ?? job.timeoutSeconds,
        ...(nextRunAt !== undefined && { nextRunAt }),
      },
    });

    await this.eventService.emit('cron.job_updated', projectId, { jobId });
    if (updated.enabled) await this.scheduler.scheduleJob(updated);
    return this.withTargetType(updated);
  }

  async deleteCronJob(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');
    this.scheduler.unscheduleJob(jobId);
    await this.prisma.cronJob.delete({ where: { id: jobId } });
    await this.eventService.emit('cron.job_deleted', projectId, { jobId });
    return { deleted: true };
  }

  async triggerCronJob(projectId: string, jobId: string, dto: { payload?: Record<string, unknown> }) {
    const job = await this.prisma.cronJob.findFirst({ where: { id: jobId, projectId } });
    if (!job) throw new NotFoundException('Cron job not found');

    const scheduledAt = new Date();
    let run: { id: string };
    try {
      run = await this.prisma.cronJobRun.create({
        data: { cronJobId: jobId, status: 'running', attempt: 1, scheduledAt, executionReason: 'manual' },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Structured dedup: emit observable event
        await this.eventService.emit('cron.job_run_deduplicated', projectId, {
          jobId, scheduledAt: scheduledAt.toISOString(), reason: 'manual_trigger_collision',
        });
        return { runId: null, status: 'duplicate', message: 'A run for this scheduled time already exists.' };
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
        url: job.endpoint ?? undefined,
        method: 'POST',
        headers: {},
        body: dto.payload ?? job.payload ?? {},
        functionId: job.functionId ?? undefined,
      },
    };
    await this.schedulerQueueService.enqueue(request);
    await this.eventService.emit('cron.job_run_started', projectId, {
      runId: run.id, jobId, attempt: 1,
    });
    return { runId: run.id, status: 'enqueued' };
  }
}
