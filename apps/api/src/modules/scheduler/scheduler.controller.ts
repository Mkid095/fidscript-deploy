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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SchedulerService } from './scheduler.service.js';
import { CreateCronJobDto, UpdateCronJobDto, TriggerCronJobDto } from './dto/index.js';

@ApiTags('scheduler')
@Controller('projects/:projectId/cron')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Post()
  @ApiOperation({ summary: 'Create cron job' })
  async createCronJob(@Param('projectId') projectId: string, @Body() dto: CreateCronJobDto) {
    return this.schedulerService.createCronJob(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cron jobs' })
  async listCronJobs(@Param('projectId') projectId: string) {
    const jobs = await this.schedulerService.listCronJobs(projectId);
    return { jobs };
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get cron job' })
  async getCronJob(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.schedulerService.getCronJob(projectId, jobId);
  }

  @Patch(':jobId')
  @ApiOperation({ summary: 'Update cron job' })
  async updateCronJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCronJobDto,
  ) {
    return this.schedulerService.updateCronJob(projectId, jobId, dto);
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Delete cron job' })
  async deleteCronJob(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.schedulerService.deleteCronJob(projectId, jobId);
  }

  @Post(':jobId/trigger')
  @ApiOperation({ summary: 'Trigger cron job' })
  async triggerCronJob(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Body() dto: TriggerCronJobDto,
  ) {
    return this.schedulerService.triggerCronJob(projectId, jobId, dto);
  }

  @Get(':jobId/next-run')
  @ApiOperation({ summary: 'Get next run time' })
  async getCronJobNextRun(@Param('projectId') projectId: string, @Param('jobId') jobId: string) {
    return this.schedulerService.getCronJobNextRun(projectId, jobId);
  }

  @Get(':jobId/runs')
  @ApiOperation({ summary: 'Get cron job runs' })
  async getCronJobRuns(
    @Param('projectId') projectId: string,
    @Param('jobId') jobId: string,
    @Query() query: { limit?: number; cursor?: string; status?: string },
  ) {
    return this.schedulerService.getCronJobRuns(projectId, jobId, query.limit, query.cursor, query.status);
  }
}