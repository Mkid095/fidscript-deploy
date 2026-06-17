import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JetStreamClient, NatsConnection } from 'nats';
import { PlatformEvent } from '@fidscript/events';

const EVENTS_STREAM = 'EVENTS';

@Injectable()
export class EventNatsConsumerService {
  private readonly logger = new Logger(EventNatsConsumerService.name);

  constructor(private eventEmitter: EventEmitter2) {}

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
          const event: PlatformEvent = JSON.parse(new TextDecoder().decode(msg.data));
          this.eventEmitter.emit(event.type, event);
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
