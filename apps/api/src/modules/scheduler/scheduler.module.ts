import { Module } from '@nestjs/common';
import { SchedulerController } from './controllers/scheduler.controller';
import { CronJobService } from './services/cron-job.service';
import { CronJobExecutionService } from './services/cron-job-execution.service';
import { CronJobSchedulerService } from './services/cron-job-scheduler.service';
import { FunctionsModule } from '@/modules/functions/functions.module';

@Module({
  imports: [FunctionsModule],
  controllers: [SchedulerController],
  providers: [
    CronJobService,
    CronJobExecutionService,
    CronJobSchedulerService,
  ],
  exports: [CronJobService, CronJobExecutionService],
})
export class SchedulerModule {}
