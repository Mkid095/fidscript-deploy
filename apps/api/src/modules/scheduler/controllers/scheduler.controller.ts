import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { CronJobService } from '@/modules/scheduler/services/cron-job.service';
import { CronJobExecutionService } from '@/modules/scheduler/services/cron-job-execution.service';
import { SchedulerQueueService } from '@/modules/scheduler/services/scheduler-queue.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCronJobDto, UpdateCronJobDto, TriggerCronJobDto } from '@/modules/scheduler/dto/index';

@ApiTags('scheduler')
@Controller('projects/:projectId/cron')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(
    private cronJobService: CronJobService,
    private cronJobExecutionService: CronJobExecutionService,
    private schedulerQueueService: SchedulerQueueService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create cron job' })
  async createCronJob(@Param('projectId') projectId: string, @Body() dto: CreateCronJobDto) {
    return this.cronJobService.createCronJob(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cron jobs' })
  async listCronJobs(@Param('projectId') projectId: string) {
    const jobs = await this.cronJobService.listCronJobs(projectId);
    return { jobs };
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get cron job' })
  async getCronJob(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.cronJobService.getCronJob(projectId, jobId);
  }

  @Patch(':jobId')
  @ApiOperation({ summary: 'Update cron job' })
  async updateCronJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCronJobDto,
  ) {
    return this.cronJobService.updateCronJob(projectId, jobId, dto);
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Delete cron job' })
  async deleteCronJob(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.cronJobService.deleteCronJob(projectId, jobId);
  }

  @Post(':jobId/trigger')
  @ApiOperation({ summary: 'Trigger cron job' })
  async triggerCronJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() dto: TriggerCronJobDto,
  ) {
    return this.cronJobService.triggerCronJob(projectId, jobId, dto);
  }

  @Get(':jobId/next-run')
  @ApiOperation({ summary: 'Get next run time' })
  async getCronJobNextRun(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.cronJobExecutionService.getCronJobNextRun(projectId, jobId);
  }

  @Get(':jobId/runs')
  @ApiOperation({ summary: 'Get cron job runs' })
  async getCronJobRuns(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Query() query: { limit?: number; cursor?: string; status?: string },
  ) {
    return this.cronJobExecutionService.getCronJobRuns(projectId, jobId, query.limit, query.cursor, query.status);
  }

  @Get(':jobId/simulate')
  @ApiOperation({ summary: 'Simulate next N execution times for a cron job (dry-run)' })
  async simulateCronJobRuns(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Query('count') count?: string,
  ) {
    return this.cronJobExecutionService.simulateRuns(projectId, jobId, count ? parseInt(count) : 5);
  }

  @Post('simulate-expression')
  @ApiOperation({ summary: 'Simulate next N execution times for any cron expression (dry-run)' })
  async simulateExpression(
    @Body() body: { cronExpression: string; timezone?: string; count?: number },
  ) {
    return this.cronJobExecutionService.simulateExpression(
      body.cronExpression,
      body.timezone ?? 'UTC',
      body.count ?? 5,
    );
  }

  @Get(':jobId/stats')
  @ApiOperation({ summary: 'Get lightweight run statistics for a cron job' })
  async getCronJobStats(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Query('window') window?: string,
  ) {
    return this.cronJobExecutionService.getCronJobStats(projectId, jobId, window ? parseInt(window) : 50);
  }

  @Post(':jobId/runs/:runId/replay')
  @ApiOperation({ summary: 'Replay a failed or completed run with its stored payload snapshot' })
  async replayRun(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Param('runId') runId: string,
  ) {
    // 1. Load the original run and verify it belongs to the job/project
    const originalRun = await this.prisma.cronJobRun.findFirst({
      where: { id: runId, cronJobId: jobId },
      include: { cronJob: true },
    });
    if (!originalRun) {
      return { error: 'Run not found' };
    }
    const job = originalRun.cronJob;
    if (job.projectId !== projectId) {
      return { error: 'Run not found' };
    }
    // Require payload snapshot for deterministic replay
    if (!originalRun.payloadSnapshot) {
      return { error: 'Run has no payload snapshot — replay not available' };
    }

    // 2. Create a new run record linked to the original
    const scheduledAt = new Date();
    const newRun = await this.prisma.cronJobRun.create({
      data: {
        cronJobId: jobId,
        status: 'running',
        attempt: 1,
        scheduledAt,
        replayedFromRunId: runId,
        payloadSnapshot: originalRun.payloadSnapshot as any,
        executionReason: 'scheduled',
      },
    });

    // 3. Enqueue via the worker queue
    const request = {
      runId: newRun.id,
      jobId: job.id,
      projectId: job.projectId,
      attempt: 1,
      scheduledAt: scheduledAt.toISOString(),
      payloadSnapshot: originalRun.payloadSnapshot as any,
    };
    await this.schedulerQueueService.enqueue(request);

    return { runId: newRun.id, replayedFrom: runId, status: 'enqueued' };
  }
}
