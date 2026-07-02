import { Module } from '@nestjs/common';
import { SchedulerController } from './controllers/scheduler.controller';
import { CronJobService } from './services/cron-job.service';
import { CronJobExecutionService } from './services/cron-job-execution.service';
import { CronJobSchedulerService } from './services/cron-job-scheduler.service';
import { SchedulerQueueService } from './services/scheduler-queue.service';
import { SchedulerWorkerService } from './services/scheduler-worker.service';
import { FunctionsModule } from '@/modules/functions/functions.module';

@Module({
  imports: [FunctionsModule],
  controllers: [SchedulerController],
  providers: [
    CronJobService,
    CronJobExecutionService,
    CronJobSchedulerService,
    SchedulerQueueService,
    SchedulerWorkerService,
  ],
  exports: [CronJobService, CronJobExecutionService, SchedulerQueueService],
})
export class SchedulerModule {}
