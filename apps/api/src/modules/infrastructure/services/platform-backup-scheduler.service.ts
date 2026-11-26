/**
 * PlatformBackupSchedulerService — registers the platform backup crons on startup.
 *
 * Uses the `cron` package (same as user-defined CronJobs) with Redis
 * distributed locks to prevent double-fires in multi-worker deployments:
 *
 *  - a backup, daily at 02:00 UTC by default (PLATFORM_BACKUP_CRON);
 *  - a restore verification, weekly (PLATFORM_BACKUP_VERIFY_CRON, default
 *    04:00 UTC Sundays) — an archive is only worth what it restores to.
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
const VERIFY_CRON_LOCK = 'platform-backup:verify-cron-lock';
const LOCK_TTL_MS = 55 * 60 * 1000; // 55 min — release before next fire at 60 min

@Injectable()
export class PlatformBackupSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformBackupSchedulerService.name);
  private tasks: CronJob[] = [];

  constructor(
    private backup: PlatformBackupService,
    private redis: RedisService,
    private config: ConfigService,
  ) {
    this.scheduleBackup(this.config.get<string>('PLATFORM_BACKUP_CRON', '0 2 * * *'));
    this.scheduleVerify(this.config.get<string>('PLATFORM_BACKUP_VERIFY_CRON', '0 4 * * 0'));
  }

  private scheduleBackup(cronExpr: string) {
    try {
      this.tasks.push(new CronJob(cronExpr, async () => {
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
      }, null, true, 'UTC'));
      this.logger.log(`[backup-scheduler] Platform backup scheduled: ${cronExpr} (UTC)`);
    } catch (err) {
      this.logger.warn(`[backup-scheduler] Failed to schedule backup: ${(err as Error).message}`);
    }
  }

  private scheduleVerify(cronExpr: string) {
    try {
      this.tasks.push(new CronJob(cronExpr, async () => {
        const token = crypto.randomUUID();
        const acquired = await this.redis.acquireLock(VERIFY_CRON_LOCK, token, LOCK_TTL_MS);
        if (!acquired) {
          this.logger.debug('[backup-scheduler] Verify lock held by another worker, skipping');
          return;
        }
        try {
          this.logger.log('[backup-scheduler] Running scheduled restore verification');
          const result = await this.backup.verifyLatestBackup();
          this.logger.log(
            result.ok
              ? `[backup-scheduler] Restore verification passed (${result.backupId})`
              : `[backup-scheduler] Restore verification FAILED (${result.backupId ?? 'no backup'}): ${result.error}`,
          );
        } catch (err) {
          this.logger.error(`[backup-scheduler] Verify failed: ${(err as Error).message}`);
        } finally {
          await this.redis.releaseLock(VERIFY_CRON_LOCK, token);
        }
      }, null, true, 'UTC'));
      this.logger.log(`[backup-scheduler] Restore verification scheduled: ${cronExpr} (UTC)`);
    } catch (err) {
      this.logger.warn(`[backup-scheduler] Failed to schedule verify: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    for (const task of this.tasks) task.stop();
    this.tasks = [];
  }
}
