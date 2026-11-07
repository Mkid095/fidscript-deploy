import { Module, forwardRef } from '@nestjs/common';
import { SchedulerController } from './controllers/scheduler.controller';
import { CronJobService } from './services/cron-job.service';
import { CronJobExecutionService } from './services/cron-job-execution.service';
import { CronJobActionExecutorService } from './services/cron-job-action-executor.service';
import { CronJobRetryRunnerService } from './services/cron-job-retry-runner.service';
import { CronJobQueryService } from './services/cron-job-query.service';
import { CronJobSchedulerService } from './services/cron-job-scheduler.service';
import { SchedulerQueueService } from './services/scheduler-queue.service';
import { SchedulerWorkerService } from './services/scheduler-worker.service';
import { FunctionsModule } from '@/modules/functions/functions.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { EmailModule } from '@/modules/email/email.module';
import { QueuesModule } from '@/modules/queues/queues.module';

@Module({
  imports: [FunctionsModule, AuthModule, ProjectsModule, EmailModule, forwardRef(() => QueuesModule)],
  controllers: [SchedulerController],
  providers: [
    CronJobService,
    CronJobExecutionService,
    CronJobActionExecutorService,
    CronJobRetryRunnerService,
    CronJobQueryService,
    CronJobSchedulerService,
    SchedulerQueueService,
    SchedulerWorkerService,
  ],
  exports: [CronJobService, CronJobExecutionService, SchedulerQueueService],
})
export class SchedulerModule {}
