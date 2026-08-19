/**
 * PlatformBackupSchedulerService — registers the platform backup cron on startup.
 *
 * Uses the `cron` package (same as user-defined CronJobs) with Redis
 * distributed lock to prevent double-fires in multi-worker deployments.
 * Runs daily at 02:00 UTC by default (PLATFORM_BACKUP_CRON env var).
 *
 * Import: add InfrastructureModule to AppModule (which exports PlatformBackupService
 * and registers PlatformBackupSchedulerService as a provider).
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import * as crypto from 'crypto';
import { PlatformBackupService } from './platform-backup.service';
import { RedisService } from '@/modules/redis/redis.service';

const BACKUP_CRON_LOCK = 'platform-backup:cron-lock';
const LOCK_TTL_MS = 55 * 60 * 1000; // 55 min — release before next fire at 60 min

@Injectable()
export class PlatformBackupSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformBackupSchedulerService.name);
  private task: CronJob | null = null;

  constructor(
    private backup: PlatformBackupService,
    private redis: RedisService,
    private config: ConfigService,
  ) {
    const cronExpr = this.config.get<string>('PLATFORM_BACKUP_CRON', '0 2 * * *');
    this.schedule(cronExpr);
  }

  private schedule(cronExpr: string) {
    try {
      this.task = new CronJob(cronExpr, async () => {
        const token = crypto.randomUUID();
        const acquired = await this.redis.acquireLock(BACKUP_CRON_LOCK, token, LOCK_TTL_MS);
        if (!acquired) {
          this.logger.debug('[backup-scheduler] Lock held by another worker, skipping');
          return;
        }
        try {
          this.logger.log('[backup-scheduler] Running scheduled platform backup');
          await this.backup.runBackup();
        } catch (err) {
          this.logger.error(`[backup-scheduler] Backup failed: ${(err as Error).message}`);
        } finally {
          await this.redis.releaseLock(BACKUP_CRON_LOCK, token);
        }
      }, null, true, 'UTC');
      this.logger.log(`[backup-scheduler] Platform backup scheduled: ${cronExpr} (UTC)`);
    } catch (err) {
      this.logger.warn(`[backup-scheduler] Failed to schedule: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    this.task?.stop();
  }
}
