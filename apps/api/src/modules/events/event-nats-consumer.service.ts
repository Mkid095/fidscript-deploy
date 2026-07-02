import { Injectable, Logger } from '@nestjs/common';
import { JetStreamClient, NatsConnection } from 'nats';

const EVENTS_STREAM = 'EVENTS';

/**
 * Reads platform events from NATS JetStream for audit persistence.
 *
 * IMPORTANT: Do NOT re-emit to EventEmitter2 here. EventService.emit() already
 * fires to the local EventEmitter2 synchronously for in-process fan-out
 * (RealtimeBridgeService, AuditEventConsumer, etc.). The NATS path is
 * exclusively for durability — replaying events after a server restart.
 * Re-emitting here would cause double delivery to RealtimeBridgeService.
 */
@Injectable()
export class EventNatsConsumerService {
  private readonly logger = new Logger(EventNatsConsumerService.name);

  async startDurableConsumer(nc: NatsConnection, js: JetStreamClient) {
    const CONSUMER_NAME = 'audit-replay';

    try {
      const jsm = await nc.jetstreamManager();
      await jsm.consumers.add(EVENTS_STREAM, {
        durable_name: CONSUMER_NAME,
        ack_policy: 'explicit' as any,
        filter_subject: 'events.>',
      });
    } catch { /* already exists */ }

    const consumer = await js.consumers.get(EVENTS_STREAM, CONSUMER_NAME);
    const messages = await consumer.consume();

    (async () => {
      for await (const msg of messages) {
        try {
          // Parse and acknowledge only — fan-out is handled synchronously
          // by EventService.emit() via the local EventEmitter2.
          JSON.parse(new TextDecoder().decode(msg.data));
          msg.ack();
        } catch (err) {
          this.logger.error(`Error processing durable consumer message: ${(err as Error).message}`);
          msg.nak();
        }
      }
    })().catch((err) => {
      this.logger.warn(`Durable consumer loop exited: ${(err as Error).message}`);
    });

    this.logger.log(`Durable consumer "${CONSUMER_NAME}" started on stream "${EVENTS_STREAM}"`);
  }
}
