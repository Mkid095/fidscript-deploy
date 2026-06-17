import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { connect, JetStreamClient, NatsConnection } from 'nats';
import { randomUUID } from 'crypto';
import { PlatformEvent, EventType } from '@fidscript/events';

const EVENTS_STREAM = 'EVENTS';
const EVENTS_SUBJECT_PREFIX = 'events.';

@Injectable()
export class EventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private eventEmitter: EventEmitter2;
  private connected = false;

  // Map of local event type → handlers registered via @OnEvent
  private localHandlers = new Map<string, Set<Function>>();

  constructor(private configService: ConfigService) {
    // Local backbone — always present, works without NATS
    this.eventEmitter = new EventEmitter2({
      wildcard: true,
      verboseMemoryLeak: true,
    });
  }

  async onModuleInit() {
    await this.initNats();
  }

  private async initNats() {
    const natsUrl = this.configService.get<string>('NATS_URL');
    if (!natsUrl) {
      this.logger.warn('NATS_URL not configured — events run locally only (no durable transport)');
      return;
    }

    try {
      this.nc = await connect({ servers: [natsUrl] });
      this.js = this.nc.jetstream();

      // Ensure the EVENTS stream exists (idempotent — addStream is create-or-update)
      try {
        const jsm = await this.nc.jetstreamManager();
        await jsm.streams.add({
          name: EVENTS_STREAM,
          subjects: [`${EVENTS_SUBJECT_PREFIX}>`],
        });
        this.logger.log(`NATS JetStream stream "${EVENTS_STREAM}" ensured`);
      } catch (err) {
        this.logger.warn(`Could not create JetStream stream: ${(err as Error).message}`);
      }

      this.connected = true;
      this.logger.log('Connected to NATS for durable event transport');

      // Start durable consumer that re-feeds local handlers for cross-restart durability
      this.startDurableConsumer().catch((err) => {
        this.logger.warn(`Durable consumer failed to start: ${(err as Error).message}`);
      });
    } catch (error) {
      this.logger.warn(`Failed to connect to NATS, events run locally only: ${(error as Error).message}`);
    }
  }

  /**
   * Emit an event. Always dispatches locally via EventEmitter2 (same-process,
   * synchronous). If NATS is connected, also publishes to JetStream for durability
   * and cross-service fan-out.
   *
   * The `type` should be a typed EventType from @fidscript/events — callers
   * migrate to the typed scheme in task 27.
   */
  emit<T = unknown>(type: EventType, payload: T): void {
    const id = randomUUID();
    const timestamp = new Date();

    // Always dispatch locally — this fires @OnEvent handlers synchronously
    const platformEvent: PlatformEvent<T> = {
      id,
      type: type as EventType,
      timestamp,
      metadata: payload,
    };

    // Local handlers (e.g. the audit consumer in this module)
    this.eventEmitter.emit(type, platformEvent);
    this.logger.debug(`[local] Event dispatched: ${type}`, { id });

    // Durable transport via JetStream (if connected)
    if (this.connected && this.js) {
      const subject = `${EVENTS_SUBJECT_PREFIX}${type}`;
      this.js
        .publish(subject, JSON.stringify(platformEvent))
        .catch((err) => this.logger.error(`Failed to publish event ${type} to NATS: ${(err as Error).message}`));
    }
  }

  /**
   * Subscribe to an event locally. Handlers receive the full PlatformEvent.
   * Use this for one-off subscriptions; for persistent consumers use @OnEvent decorator.
   * Returns an unsubscribe function.
   */
  on(type: string | EventType, handler: (event: PlatformEvent) => void): () => void {
    this.eventEmitter.on(type as string, handler);
    return () => this.eventEmitter.off(type as string, handler);
  }

  /**
   * Start a durable JetStream consumer that re-feeds events into the local
   * EventEmitter2 on restart — so events published while NATS was down (or before
   * this consumer existed) still trigger local handlers.
   */
  private async startDurableConsumer() {
    if (!this.nc || !this.js) return;

    const CONSUMER_NAME = 'audit-replay';

    // Create durable consumer if it doesn't exist
    try {
      const jsm = await this.nc.jetstreamManager();
      await jsm.consumers.add(EVENTS_STREAM, {
        durable_name: CONSUMER_NAME,
        ack_policy: 'explicit' as any,
        filter_subject: `${EVENTS_SUBJECT_PREFIX}>`,
      });
    } catch (err) {
      // Consumer may already exist — that's fine
    }

    const consumer = await this.js.consumers.get(EVENTS_STREAM, CONSUMER_NAME);
    const messages = await consumer.consume();

    (async () => {
      for await (const msg of messages) {
        try {
          const event: PlatformEvent = JSON.parse(new TextDecoder().decode(msg.data));
          // Re-dispatch into local EventEmitter2 so handlers fire for historical events too
          this.eventEmitter.emit(event.type, event);
          msg.ack();
        } catch (err) {
          this.logger.error(`Error processing durable consumer message: ${(err as Error).message}`);
          msg.nak(); // requeue
        }
      }
    })().catch((err) => {
      this.logger.warn(`Durable consumer loop exited: ${(err as Error).message}`);
    });

    this.logger.log(`Durable consumer "${CONSUMER_NAME}" started on stream "${EVENTS_STREAM}"`);
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.close();
    }
  }
}