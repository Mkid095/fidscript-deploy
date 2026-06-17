import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { CreateCronJobDto, UpdateCronJobDto, TriggerCronJobDto } from './dto/index';
import * as cron from 'cron';

@Injectable()
export class SchedulerService {
  private runningJobs: Map<string, cron.CronJob> = new Map();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventService: EventService,
  ) {}

  async createCronJob(projectId: string, dto: CreateCronJobDto) {
    // Validate cron expression
    try {
      new cron.CronTime(dto.cronExpression);
    } catch {
      throw new Error('Invalid cron expression');
    }

    const job = await this.prisma.cronJob.create({
      data: {
        projectId,
        name: dto.name,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC',
        endpoint: dto.endpoint,
        functionId: dto.functionId,
        payload: (dto.payload || {}) as any,
        enabled: dto.enabled ?? true,
        retryAttempts: dto.retryAttempts || 3,
        retryDelaySeconds: dto.retryDelaySeconds || 60,
        timeoutSeconds: dto.timeoutSeconds || 300,
      },
    });

    await this.eventService.emit('cron.job_created', {
      jobId: job.id,
      projectId,
      name: dto.name,
    });

    if (job.enabled) {
      await this.scheduleJob(job);
    }

    return job;
  }

  async listCronJobs(projectId: string) {
    return this.prisma.cronJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCronJob(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');
    return job;
  }

  async updateCronJob(projectId: string, jobId: string, dto: UpdateCronJobDto) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    if (dto.cronExpression) {
      try {
        new cron.CronTime(dto.cronExpression);
      } catch {
        throw new Error('Invalid cron expression');
      }
    }

    // Unschedule existing job
    this.unscheduleJob(jobId);

    const updated = await this.prisma.cronJob.update({
      where: { id: jobId },
      data: {
        name: dto.name ?? job.name,
        cronExpression: dto.cronExpression ?? job.cronExpression,
        timezone: dto.timezone ?? job.timezone,
        endpoint: dto.endpoint ?? job.endpoint,
        functionId: dto.functionId ?? job.functionId,
        payload: (dto.payload ?? job.payload) as any,
        enabled: dto.enabled ?? job.enabled,
        retryAttempts: dto.retryAttempts ?? job.retryAttempts,
        retryDelaySeconds: dto.retryDelaySeconds ?? job.retryDelaySeconds,
        timeoutSeconds: dto.timeoutSeconds ?? job.timeoutSeconds,
      },
    });

    await this.eventService.emit('cron.job_updated', {
      jobId,
      projectId,
    });

    if (updated.enabled) {
      await this.scheduleJob(updated);
    }

    return updated;
  }

  async deleteCronJob(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    this.unscheduleJob(jobId);
    await this.prisma.cronJob.delete({ where: { id: jobId } });

    await this.eventService.emit('cron.job_deleted', { jobId, projectId });

    return { deleted: true };
  }

  async triggerCronJob(projectId: string, jobId: string, dto: TriggerCronJobDto) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    return this.executeJob(job, dto.payload);
  }

  async getCronJobRuns(projectId: string, jobId: string, limit = 50, cursor?: string, status?: string) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
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
    if (hasMore) runs.pop();

    return {
      runs: runs.reverse(),
      nextCursor: hasMore ? runs[runs.length - 1]?.id : null,
    };
  }

  async getCronJobNextRun(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    try {
      const cronTime = new cron.CronTime(job.cronExpression, job.timezone);
      const nextDate = cronTime.sendAt();
      return { nextRunAt: (nextDate as any).toISOString() };
    } catch {
      return { nextRunAt: null };
    }
  }

  private async scheduleJob(job: any) {
    if (this.runningJobs.has(job.id)) {
      return;
    }

    try {
      const cronJob = new cron.CronJob(
        job.cronExpression,
        async () => {
          await this.executeJob(job);
        },
        null,
        true,
        job.timezone,
      );

      this.runningJobs.set(job.id, cronJob);
    } catch (error) {
      console.error(`Failed to schedule job ${job.id}:`, error);
    }
  }

  private unscheduleJob(jobId: string) {
    const job = this.runningJobs.get(jobId);
    if (job) {
      job.stop();
      this.runningJobs.delete(jobId);
    }
  }

  private async executeJob(job: any, overridePayload?: Record<string, unknown>) {
    const run = await this.prisma.cronJobRun.create({
      data: {
        cronJobId: job.id,
        status: 'running',
        startedAt: new Date(),
      },
    });

    await this.eventService.emit('cron.job_run_started', {
      runId: run.id,
      jobId: job.id,
      projectId: job.projectId,
    });

    try {
      const payload = overridePayload || job.payload;

      if (job.endpoint) {
        // HTTP call to endpoint
        const response = await fetch(job.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      await this.eventService.emit('cron.job_run_completed', {
        runId: run.id,
        jobId: job.id,
        projectId: job.projectId,
      });

      return { runId: run.id, status: 'completed' };
    } catch (error: any) {
      await this.prisma.cronJobRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: (error as Error).message,
        },
      });

      await this.eventService.emit('cron.job_run_failed', {
        runId: run.id,
        jobId: job.id,
        projectId: job.projectId,
        error: (error as Error).message,
      });

      // Retry logic
      if (job.retryAttempts > 0) {
        // Would schedule retry here
      }

      return { runId: run.id, status: 'failed', error: (error as Error).message };
    }
  }
}