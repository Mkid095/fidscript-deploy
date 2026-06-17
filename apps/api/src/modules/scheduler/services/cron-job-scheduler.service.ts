import { Injectable } from '@nestjs/common';
import * as cron from 'cron';
import { CronJobExecutionService } from './cron-job-execution.service';

@Injectable()
export class CronJobSchedulerService {
  private runningJobs: Map<string, cron.CronJob> = new Map();
  constructor(private execution: CronJobExecutionService) {}

  async scheduleJob(job: any) {
    if (this.runningJobs.has(job.id)) return;
    try {
      const cronJob = new cron.CronJob(
        job.cronExpression,
        async () => { await this.execution.executeJob(job); },
        null, true, job.timezone,
      );
      this.runningJobs.set(job.id, cronJob);
    } catch (error) {
      console.error(`Failed to schedule job ${job.id}:`, error);
    }
  }

  unscheduleJob(jobId: string) {
    const job = this.runningJobs.get(jobId);
    if (job) { job.stop(); this.runningJobs.delete(jobId); }
  }
}
