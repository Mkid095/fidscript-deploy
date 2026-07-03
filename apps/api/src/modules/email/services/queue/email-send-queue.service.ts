/**
 * Email send queue — enqueues outbound email for async delivery via NATS JetStream.
 *
 * Producer side only. Enqueues a job and returns immediately.
 * The EmailSendWorkerService (separate process / worker thread) consumes and delivers.
 *
 * Stream: EMAIL_SEND_STREAM = "EMAIL_SEND"
 * Subject: email.send.>
 * Durable consumer: email-send-worker
 *
 * Retry backoff (exponential with cap):
 *   attempt 1 → immediate
 *   attempt 2 → 30 min
 *   attempt 3 → 2 hours
 *   attempt 4 → 8 hours
 *   attempt 5 → 24 hours → then DEAD
 *
 * State machine: QUEUED → PROCESSING → SENT/DELIVERED/OPENED/CLICKED/BOUNCED/SOFT_BOUNCE → DEAD
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsConnection, JetStreamClient, JetStreamManager, AckPolicy } from 'nats';
import { randomUUID } from 'crypto';
import { EventService } from '@/modules/events/event.service';

const EMAIL_SEND_STREAM = 'EMAIL_SEND';
const EMAIL_SEND_SUBJECT = 'email.send';
const EMAIL_SEND_DURABLE = 'email-send-worker';
const MAX_RETRIES = 5;

// Exponential backoff in seconds
const RETRY_DELAYS: Record<number, number> = {
  1: 0,       // immediate
  2: 30 * 60, // 30 minutes
  3: 2 * 60 * 60, // 2 hours
  4: 8 * 60 * 60, // 8 hours
  5: 24 * 60 * 60, // 24 hours
};

export interface EmailSendJob {
  messageId: string; // EmailMessage.id
  projectId: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  apiKeyId?: string;
  attempt: number;
}

@Injectable()
export class EmailSendQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailSendQueueService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  constructor(private readonly eventService: EventService) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — email send queue will not function');
      return;
    }
    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
    await this.ensureStream();
    this.logger.log('EmailSendQueueService connected to NATS');
  }

  private async ensureStream() {
    if (!this.jsm) return;
    try {
      await this.jsm.streams.add({
        name: EMAIL_SEND_STREAM,
        subjects: [`${EMAIL_SEND_SUBJECT}.>`],
        max_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
        storage: 'file' as any,
      });
      this.logger.log('EMAIL_SEND stream created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`EMAIL_SEND stream setup: ${(err as Error).message}`);
      }
    }

    try {
      await this.jsm.consumers.add(EMAIL_SEND_STREAM, {
        name: EMAIL_SEND_DURABLE,
        durable_name: EMAIL_SEND_DURABLE,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 120,
        max_deliver: MAX_RETRIES + 1,
        max_ack_pending: 10,
        filter_subject: EMAIL_SEND_SUBJECT,
      });
      this.logger.log('EMAIL_SEND durable consumer created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`EMAIL_SEND consumer setup: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Enqueue an email for async delivery.
   * @param job The email send job
   * @param delaySeconds Optional delay (for retries) — JetStream stores and delivers after this duration
   */
  async enqueue(job: EmailSendJob, delaySeconds?: number): Promise<{ seq: number }> {
    if (!this.js) throw new Error('JetStream not connected');
    const body = JSON.stringify(job);
    // W3C traceparent: 00-<traceId(32 hex)>-<spanId(16 hex)>-<flags>
    const traceId = randomUUID().replace(/-/g, '').slice(0, 32);
    const spanId = randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparent = `00-${traceId}-${spanId}-01`;
    const headers: Record<string, string> = {
      'x-message-id': job.messageId,
      'x-project-id': job.projectId,
      'x-attempt': String(job.attempt),
      'traceparent': traceparent,
    };
    const opts: Record<string, unknown> = { headers };
    if (delaySeconds && delaySeconds > 0) {
      // JetStream delay: Nats-Delay header in nanoseconds
      headers['Nats-Delay'] = String(Math.floor(delaySeconds * 1_000_000_000));
    }
    const pa = await this.js.publish(EMAIL_SEND_SUBJECT, body, opts);
    this.logger.debug(
      `[email-queue] enqueued message=${job.messageId} attempt=${job.attempt}${delaySeconds ? ` delay=${delaySeconds}s` : ''} seq=${pa.seq}`,
    );
    return { seq: pa.seq };
  }

  /**
   * Schedule a retry for a failed message with exponential backoff.
   */
  async scheduleRetry(job: EmailSendJob): Promise<void> {
    const nextAttempt = job.attempt + 1;
    if (nextAttempt > MAX_RETRIES) {
      this.logger.warn(`Message ${job.messageId} exhausted all retries — marking DEAD`);
      return;
    }
    const delaySeconds = RETRY_DELAYS[nextAttempt] ?? RETRY_DELAYS[MAX_RETRIES];
    const retryJob: EmailSendJob = { ...job, attempt: nextAttempt };
    await this.enqueue(retryJob, delaySeconds);
    this.logger.log(
      `Scheduled retry ${nextAttempt}/${MAX_RETRIES} for ${job.messageId} in ${delaySeconds}s`,
    );
  }

  async getConsumer(): Promise<any> {
    if (!this.js) return null;
    try {
      return await this.js.consumers.get(EMAIL_SEND_STREAM, EMAIL_SEND_DURABLE);
    } catch {
      return null;
    }
  }
}
