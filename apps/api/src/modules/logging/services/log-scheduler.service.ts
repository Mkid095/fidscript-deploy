import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { LogRetentionService } from './log-retention.service';
import { LogShipperService } from './log-shipper.service';

/**
 * Phase 15 — platform logging scheduler.
 *
 * Runs two platform-level background tasks via setInterval (no coupling to the
 * Phase 12 CronJob system, avoiding circular dependency issues):
 *
 *   - Retention sweep: every 6 hours
 *   - Shipper flush:   every 5 minutes
 *
 * Both run fire-and-forget (errors are logged but never propagate).
 */
@Injectable()
export class LogSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogSchedulerService.name);
  private retentionTimer: ReturnType<typeof setInterval> | null = null;
  private shipperTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly retention: LogRetentionService,
    private readonly shipper: LogShipperService,
  ) {}

  async onModuleInit() {
    // Retention sweep every 6 hours (21 600 000 ms)
    this.retentionTimer = setInterval(() => {
      this.retention.runSweep().catch(err =>
        this.logger.error(`retention sweep error: ${err.message}`),
      );
    }, 6 * 60 * 60 * 1_000);

    // Shipper flush every 5 minutes
    this.shipperTimer = setInterval(() => {
      this.shipper.flushAll().catch(err =>
        this.logger.error(`shipper flush error: ${err.message}`),
      );
    }, 5 * 60 * 1_000);

    this.logger.log('LogSchedulerService started: retention=6h, shipper_flush=5m');
  }

  onModuleDestroy() {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    if (this.shipperTimer) clearInterval(this.shipperTimer);
  }
}
