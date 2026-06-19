import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { connect, JetStreamClient, NatsConnection } from 'nats';
import { randomUUID } from 'crypto';
import { PlatformEvent, EventType } from '@fidscript/events';
import { EventNatsConsumerService } from './event-nats-consumer.service';

const EVENTS_STREAM = 'EVENTS';
const EVENTS_SUBJECT_PREFIX = 'events.';

@Injectable()
export class EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private eventEmitter: EventEmitter2;
  private connected = false;

  constructor(
    private configService: ConfigService,
    private natsConsumer: EventNatsConsumerService,
  ) {
    this.eventEmitter = new EventEmitter2({ wildcard: true, verboseMemoryLeak: true });
  }

  async onModuleInit() {
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) {
      this.logger.warn('NATS_URL not configured — events run locally only');
      return;
    }
    try {
      this.nc = await connect({ servers: [natsUrl] });
      this.js = this.nc.jetstream();
      const jsm = await this.nc.jetstreamManager();
      await jsm.streams.add({ name: EVENTS_STREAM, subjects: [`${EVENTS_SUBJECT_PREFIX}>`] });
      this.connected = true;
      this.logger.log('Connected to NATS for durable event transport');
      this.natsConsumer.startDurableConsumer(this.nc, this.js).catch(
        (err: Error) => this.logger.warn(`Durable consumer failed: ${err.message}`),
      );
    } catch (error: unknown) {
      this.logger.warn(`Failed to connect to NATS: ${(error as Error).message}`);
    }
  }

  emit<T = unknown>(type: EventType, payload: T): void {
    const id = randomUUID();
    const platformEvent: PlatformEvent<T> = { id, type: type as EventType, timestamp: new Date(), metadata: payload };
    this.eventEmitter.emit(type, platformEvent);
    this.logger.debug(`[local] Event dispatched: ${type}`, { id });
    if (this.connected && this.js) {
      const subject = `${EVENTS_SUBJECT_PREFIX}${type}`;
      this.js.publish(subject, JSON.stringify(platformEvent))
        .catch((err) => this.logger.error(`Failed to publish ${type}: ${err.message}`));
    }
  }

  on(type: string | EventType, handler: (event: PlatformEvent) => void): () => void {
    this.eventEmitter.on(type as string, handler);
    return () => this.eventEmitter.off(type as string, handler);
  }

  async onModuleDestroy() {
    if (this.nc) await this.nc.close();
  }

  /** Expose the NATS connection so other modules can attach JetStream consumers. */
  getNatsConnection(): NatsConnection | null {
    return this.nc;
  }
}
