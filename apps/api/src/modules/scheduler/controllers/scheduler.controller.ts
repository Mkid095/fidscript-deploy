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
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CronJobService } from '@/modules/scheduler/services/cron-job.service';
import { CronJobExecutionService } from '@/modules/scheduler/services/cron-job-execution.service';
import { CreateCronJobDto, UpdateCronJobDto, TriggerCronJobDto } from '@/modules/scheduler/dto/index';

@ApiTags('scheduler')
@Controller('projects/:projectId/cron')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(
    private cronJobService: CronJobService,
    private cronJobExecutionService: CronJobExecutionService,
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
}
