import { Injectable, Logger } from '@nestjs/common';
import { LogBatch, LogShipper, LogShipperConfig } from '../../interfaces/log-shipper.interface';
import { MinioProvider } from '@/modules/storage/providers/minio.provider';

@Injectable()
export class MinioShipper implements LogShipper {
  readonly type = 'minio';
  private readonly logger = new Logger(MinioShipper.name);

  constructor(private readonly minio: MinioProvider) {}

  async deliver(batch: LogBatch, config: LogShipperConfig): Promise<void> {
    const bucket = config.bucket ?? 'fidscript-logs';

    // One gzipped JSONL file per project / stream / hour
    const shippedAt = new Date(batch.shippedAt);
    const key = [
      'logs',
      batch.projectId,
      batch.streamName,
      `${shippedAt.toISOString().slice(0, 13)}.jsonl.gz`,
    ].join('/');

    const lines = batch.entries
      .map(e => JSON.stringify({ ...e }))
      .join('\n') + '\n';

    const { gzipSync } = await import('zlib');
    const compressed = gzipSync(Buffer.from(lines, 'utf8'));

    await this.minio.upload(key, compressed, 'application/gzip');

    this.logger.debug(
      `MinioShipper: shipped ${batch.entries.length} entries (${compressed.length} B gzipped) → ${bucket}/${key}`,
    );
  }
}
