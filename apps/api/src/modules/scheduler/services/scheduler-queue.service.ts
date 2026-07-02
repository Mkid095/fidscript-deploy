import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsConnection, JetStreamClient, JetStreamManager, AckPolicy } from 'nats';
import { EventService } from '@/modules/events/event.service';

const SCHEDULER_STREAM = 'SCHEDULER';
const SCHEDULER_SUBJECT = 'scheduler.jobs';
const SCHEDULER_DURABLE = 'scheduler-worker';

export interface SchedulerExecutionRequest {
  runId: string;
  jobId: string;
  projectId: string;
  attempt: number;
  scheduledAt: string;
  payloadSnapshot: {
    type: 'endpoint' | 'function';
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    functionId?: string;
  };
  /** Why this run was created: scheduled | retry | manual | lease_recovery */
  executionReason?: string;
}

@Injectable()
export class SchedulerQueueService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerQueueService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  constructor(private readonly eventService: EventService) {}

  async onModuleInit() {
    // Wait for EventService to connect to NATS (same pattern as QueuesModule)
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — scheduler queue will not function');
      return;
    }
    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
    await this.ensureStream();
    this.logger.log('SchedulerQueueService connected to NATS');
  }

  private async ensureStream() {
    if (!this.jsm) return;
    try {
      await this.jsm.streams.add({
        name: SCHEDULER_STREAM,
        subjects: [`${SCHEDULER_SUBJECT}.>`],
        max_bytes: 1 * 1024 * 1024 * 1024, // 1 GB
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
        storage: 'file' as any,
      });
      this.logger.log('SCHEDULER stream created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`SCHEDULER stream setup: ${(err as Error).message}`);
      }
    }

    // Ensure durable consumer exists for the worker
    try {
      await this.jsm.consumers.add(SCHEDULER_STREAM, {
        name: SCHEDULER_DURABLE,
        durable_name: SCHEDULER_DURABLE,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 300,
        max_deliver: 5,
        max_ack_pending: 10,
        filter_subject: SCHEDULER_SUBJECT,
      });
      this.logger.log('SCHEDULER durable consumer created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`SCHEDULER consumer setup: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Enqueue a scheduler execution request to NATS JetStream.
   * This is the ONLY thing this service does — no execution here.
   *
   * @param request The execution request
   * @param delaySeconds Optional delay before the message becomes deliverable (JetStream stores it and delivers after this duration).
   *                    Used for retry backoff: delaySeconds = baseDelay * 2^(attempt-1).
   */
  async enqueue(
    request: SchedulerExecutionRequest,
    delaySeconds?: number,
  ): Promise<{ seq: number }> {
    if (!this.js) throw new Error('JetStream not connected');
    const body = JSON.stringify(request);
    const opts: Record<string, unknown> = {
      headers: {
        'x-job-id': request.jobId,
        'x-run-id': request.runId,
        'x-project-id': request.projectId,
      },
    };
    if (delaySeconds && delaySeconds > 0) {
      (opts.headers as Record<string, string>)['Nats-Delay'] = String(
        Math.floor(delaySeconds * 1_000_000_000),
      );
    }
    const pa = await this.js.publish(SCHEDULER_SUBJECT, body, opts);
    this.logger.debug(
      `[scheduler] enqueued job=${request.jobId} run=${request.runId} attempt=${request.attempt}${delaySeconds ? ` delay=${delaySeconds}s` : ''} seq=${pa.seq}`,
    );
    return { seq: pa.seq };
  }

  /**
   * Get a JetStream consumer handle for fetching messages.
   */
  async getConsumer(): Promise<any> {
    if (!this.js) return null;
    try {
      return await this.js.consumers.get(SCHEDULER_STREAM, SCHEDULER_DURABLE);
    } catch {
      return null;
    }
  }
}
