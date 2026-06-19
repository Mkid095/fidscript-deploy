import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AlertEvaluatorService } from '@/modules/monitoring/services/alert-evaluator.service';

const SOFT_QUOTA = 50_000; // max entries per stream in a rolling 24 h window
const QUOTA_METRIC = 'log.ingest.count';

/**
 * Phase 15 — soft volume quota per log stream.
 *
 * Counts entries in a rolling 24 h window and fires a Phase 14 alert via
 * AlertEvaluatorService when the soft quota is breached.  Writes are never
 * hard-blocked — the quota breach is emitted as an event so Realtime subscribers
 * can see it and the Phase 14 alert can notify the team.
 */
@Injectable()
export class LogQuotaService {
  private readonly logger = new Logger(LogQuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly alertEvaluator: AlertEvaluatorService,
  ) {}

  /**
   * Check whether the stream is within its soft quota.
   * Emits a Phase-14 alert via AlertEvaluatorService if over quota.
   * Returns true if within quota, false if over.
   */
  async checkQuota(projectId: string, streamId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await this.prisma.logEntry.count({
      where: { streamId, timestamp: { gte: windowStart } },
    });

    if (count >= SOFT_QUOTA) {
      this.logger.warn(`[quota] project=${projectId} stream=${streamId} over soft quota: ${count}/${SOFT_QUOTA}`);
      // Fan to Phase 14 alert engine
      await this.alertEvaluator.evaluate(projectId, QUOTA_METRIC, count);
      // Also emit a dedicated Realtime-visible event
      this.eventService.emit('logs.quota_exceeded', {
        projectId, streamId, count, quota: SOFT_QUOTA,
      });
      return false;
    }

    return true;
  }

  /** Current 24-hour entry count for a stream. */
  async getStreamCount(streamId: string): Promise<number> {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.logEntry.count({
      where: { streamId, timestamp: { gte: windowStart } },
    });
  }
}
