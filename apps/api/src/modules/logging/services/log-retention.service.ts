import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

const BATCH_SIZE = 5000;

/**
 * Phase 15 — retention enforcement.
 *
 * A batched delete sweep that removes LogEntry rows older than each stream's
 * configured retentionDays.  Batches of 5 k rows to avoid long locks.
 * Called by LogSchedulerService via a setInterval (no cron job needed).
 */
@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Run the retention sweep for all streams.
   * Returns total rows deleted across all streams.
   */
  async runSweep(): Promise<{ deleted: number; errors: number }> {
    let totalDeleted = 0;
    let totalErrors = 0;

    const streams = await this.prisma.logStream.findMany({
      select: { id: true, projectId: true, name: true, retentionDays: true },
    });

    for (const stream of streams) {
      const cutoff = new Date(Date.now() - stream.retentionDays * 86_400_000);
      let batchDeleted = 0;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const result = await this.prisma.$executeRaw`
            DELETE FROM logging.entries
            WHERE id IN (
              SELECT id FROM logging.entries
              WHERE stream_id = ${stream.id}
                AND timestamp < ${cutoff}
              LIMIT ${BATCH_SIZE}
            )`;

          const n = Number(result);
          if (n === 0) break;
          batchDeleted += n;
          this.logger.debug(
            `[${stream.name}] retention batch: deleted ${n} (running total: ${batchDeleted})`,
          );
        }

        totalDeleted += batchDeleted;

        if (batchDeleted > 0) {
          this.logger.log(
            `[${stream.name}] retention sweep: removed ${batchDeleted} entries older than ${stream.retentionDays} days`,
          );
          this.eventService.emit('logs.pruned', stream.projectId, {
            streamId: stream.id,
            streamName: stream.name,
            deletedCount: batchDeleted,
            retentionDays: stream.retentionDays,
          });
        }
      } catch (err) {
        totalErrors++;
        this.logger.error(`[${stream.name}] retention sweep failed: ${(err as Error).message}`);
      }
    }

    return { deleted: totalDeleted, errors: totalErrors };
  }
}
