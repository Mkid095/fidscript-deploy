import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CronJobExecutionService } from './cron-job-execution.service';
import * as cron from 'cron';

@Injectable()
export class CronJobService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private executionService: CronJobExecutionService,
  ) {}

  async createCronJob(projectId: string, dto: {
    name: string;
    cronExpression: string;
    timezone?: string;
    endpoint?: string;
    functionId?: string;
    payload?: Record<string, any>;
    enabled?: boolean;
    retryAttempts?: number;
    retryDelaySeconds?: number;
    timeoutSeconds?: number;
  }) {
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
      await this.executionService.scheduleJob(job);
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

  async updateCronJob(projectId: string, jobId: string, dto: {
    name?: string;
    cronExpression?: string;
    timezone?: string;
    endpoint?: string;
    functionId?: string;
    payload?: Record<string, any>;
    enabled?: boolean;
    retryAttempts?: number;
    retryDelaySeconds?: number;
    timeoutSeconds?: number;
  }) {
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

    this.executionService.unscheduleJob(jobId);

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
      await this.executionService.scheduleJob(updated);
    }

    return updated;
  }

  async deleteCronJob(projectId: string, jobId: string) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    this.executionService.unscheduleJob(jobId);
    await this.prisma.cronJob.delete({ where: { id: jobId } });

    await this.eventService.emit('cron.job_deleted', { jobId, projectId });

    return { deleted: true };
  }

  async triggerCronJob(projectId: string, jobId: string, dto: { payload?: Record<string, unknown> }) {
    const job = await this.prisma.cronJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) throw new NotFoundException('Cron job not found');

    return this.executionService.executeJob(job, dto.payload);
  }
}
