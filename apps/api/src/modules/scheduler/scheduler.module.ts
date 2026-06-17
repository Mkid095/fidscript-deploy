import { Module } from '@nestjs/common';
import { SchedulerController } from './controllers/scheduler.controller';
import { CronJobService } from './services/cron-job.service';
import { CronJobExecutionService } from './services/cron-job-execution.service';

@Module({
  controllers: [SchedulerController],
  providers: [CronJobService, CronJobExecutionService],
  exports: [CronJobService, CronJobExecutionService],
})
export class SchedulerModule {}
