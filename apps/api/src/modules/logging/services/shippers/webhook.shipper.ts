import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { LogBatch, LogShipper, LogShipperConfig } from '../../interfaces/log-shipper.interface';

@Injectable()
export class WebhookShipper implements LogShipper {
  readonly type = 'webhook';
  private readonly logger = new Logger(WebhookShipper.name);

  async deliver(batch: LogBatch, config: LogShipperConfig): Promise<void> {
    if (!config.url) throw new Error('WebhookShipper: url is required');

    const body = JSON.stringify({ batch: batch.entries, shippedAt: batch.shippedAt, stream: batch.streamName });
    const signature = config.secret
      ? crypto.createHmac('sha256', config.secret).update(body).digest('hex')
      : undefined;

    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-Fidscript-Signature': signature } : {}),
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`WebhookShipper: HTTP ${res.status} — ${text}`.slice(0, 500));
    }

    this.logger.debug(`WebhookShipper: delivered ${batch.entries.length} entries to ${config.url}`);
  }
}
