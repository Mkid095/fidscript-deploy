import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { LogBatch, LogShipper, LogShipperConfig } from '../interfaces/log-shipper.interface';
import { WebhookShipper } from './shippers/webhook.shipper';
import { MinioShipper } from './shippers/minio.shipper';

const MAX_BUFFER = 1_000;
const FLUSH_INTERVAL_MS = 30_000;

interface BufferedEntry {
  projectId: string;
  streamId: string;
  streamName: string;
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * Phase 15 — log shipper coordinator.
 *
 * Buffers ingested log entries per stream and flushes them to the configured
 * sink (webhook or MinIO) when the buffer reaches MAX_BUFFER entries or when
 * the periodic timer fires (every FLUSH_INTERVAL_MS).  Delivery is retried up
 * to 3 times with back-off; on permanent failure the batch is dropped and
 * a `logs.ship_failed` event is emitted.
 *
 * Ships events:
 *   logs.shipped     — batch delivered successfully
 *   logs.ship_failed — all retries exhausted
 */
@Injectable()
export class LogShipperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogShipperService.name);
  private readonly buffer = new Map<string, BufferedEntry[]>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  // projectId -> config
  private readonly configs = new Map<string, LogShipperConfig>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly webhookShipper: WebhookShipper,
    private readonly minioShipper: MinioShipper,
  ) {}

  async onModuleInit() {
    await this.loadConfigs();
    this.flushTimer = setInterval(() => {
      this.flushAll().catch(err =>
        this.logger.error(`shipper periodic flush error: ${err.message}`),
      );
    }, FLUSH_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  /** Register or update a project's ship configuration. */
  configureShipper(projectId: string, config: LogShipperConfig): void {
    this.configs.set(projectId, config);
  }

  /** Buffer a single entry for shipping. */
  bufferEntry(
    projectId: string,
    streamId: string,
    streamName: string,
    entry: Omit<BufferedEntry, 'projectId' | 'streamId' | 'streamName'>,
  ): void {
    const key = `${projectId}:${streamId}`;
    if (!this.buffer.has(key)) this.buffer.set(key, []);
    const buf = this.buffer.get(key)!;
    buf.push({ projectId, streamId, streamName, ...entry });
    if (buf.length >= MAX_BUFFER) this.flushKey(key).catch(() => {});
  }

  /** Flush and deliver all buffered streams. */
  async flushAll(): Promise<void> {
    const keys = [...this.buffer.keys()];
    await Promise.allSettled(keys.map(k => this.flushKey(k)));
  }

  private async flushKey(key: string): Promise<void> {
    const entries = this.buffer.get(key);
    if (!entries?.length) return;
    this.buffer.set(key, []);

    const { projectId, streamId, streamName } = entries[0];
    const config = this.configs.get(projectId);
    if (!config?.enabled) return;

    const shipper: LogShipper = config.type === 'minio'
      ? this.minioShipper
      : this.webhookShipper;

    const batch: LogBatch = {
      projectId,
      streamId,
      streamName,
      entries: entries.map(e => ({
        id: e.id,
        level: e.level,
        message: e.message,
        metadata: e.metadata,
        timestamp: e.timestamp,
      })),
      shippedAt: new Date().toISOString(),
    };

    await this.deliverWithRetry(batch, shipper, config);
  }

  private async deliverWithRetry(
    batch: LogBatch,
    shipper: LogShipper,
    config: LogShipperConfig,
    maxRetries = 3,
  ): Promise<void> {
    let last: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await shipper.deliver(batch, config);
        this.events.emit('logs.shipped', batch.projectId, {
          streamId: batch.streamId,
          streamName: batch.streamName,
          count: batch.entries.length,
          shipperType: config.type,
          attempt,
        });
        return;
      } catch (err) {
        last = err as Error;
        this.logger.warn(`logs.ship attempt ${attempt}/${maxRetries} failed: ${last.message}`);
        if (attempt < maxRetries) await this.sleep(attempt * attempt * 1_000);
      }
    }

    this.events.emit('logs.ship_failed', batch.projectId, {
      streamId: batch.streamId,
      streamName: batch.streamName,
      count: batch.entries.length,
      shipperType: config.type,
      error: last?.message ?? 'unknown',
    });
  }

  private async loadConfigs(): Promise<void> {
    // Per-project ship config is stored in ProjectEnv (future); default disabled.
    // For now, shipping is opt-in per project via configureShipper() from a settings endpoint.
    const projects = await this.prisma.project.findMany({ select: { id: true } });
    for (const p of projects) {
      this.configs.set(p.id, { enabled: false, type: 'webhook' });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
