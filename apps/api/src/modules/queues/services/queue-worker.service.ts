import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsConnection } from 'nats';
import { JsMsg } from 'nats';
import { JetStreamQueueService } from './jetstream-queue.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

interface QueueTarget {
  type: 'http' | 'internal' | 'function';
  url?: string;
  functionId?: string;
}

interface QueueMessagePayload {
  body: string;
  headers: Record<string, string>;
  projectId: string;
  queueName: string;
}

/**
 * Server-side worker that autonomously pull-consumes from JetStream queues
 * and dispatches messages to their targets.
 */
@Injectable()
export class QueueWorkerService implements OnModuleInit {
  private readonly logger = new Logger(QueueWorkerService.name);
  private readonly activeLoops = new Map<string, { cancel: () => void }>();
  private nc: NatsConnection | null = null;

  constructor(
    private jsQueue: JetStreamQueueService,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async start(nc: NatsConnection): Promise<void> {
    this.nc = nc;
    await this.bootAllQueues();
  }

  async onModuleInit() {}

  private async bootAllQueues(): Promise<void> {
    const queues = await this.prisma.queue.findMany({ where: { status: 'active' } });
    this.logger.log(`Starting worker for ${queues.length} active queue(s)`);
    // Fire-and-forget: each worker runs an infinite pull loop. Awaiting it here
    // would block NestJS init() forever, so app.listen() never opens the HTTP
    // port — the bootstrap hang. Loops must run detached in the background.
    for (const q of queues) {
      this.startQueueWorker(q.id, q.projectId, q.name).catch((err: unknown) => {
        this.logger.error(`Worker for queue "${q.name}" failed to start: ${(err as Error).message}`);
      });
    }
  }

  private async startQueueWorker(queueId: string, projectId: string, queueName: string): Promise<void> {
    const loopKey = `${projectId}:${queueName}`;

    this.activeLoops.get(loopKey)?.cancel();
    let cancelled = false;
    this.activeLoops.set(loopKey, { cancel: () => { cancelled = true; } });

    const queue = await this.prisma.queue.findFirst({ where: { id: queueId, status: 'active' } });
    if (!queue) return;

    const ackWaitSeconds = queue.retryDelaySeconds || 60;
    const maxDeliver = queue.retryAttempts || 3;

    const durableName = await this.jsQueue.ensureConsumer(projectId, queueName, ackWaitSeconds, maxDeliver);
    this.logger.log(`Worker loop started for queue "${queueName}" (durable: ${durableName})`);

    const poisonTracker = new Map<number, number>();

    while (!cancelled) {
      try {
        const consumer = await this.jsQueue.getConsumer(this.jsQueue.STREAM_NAME, durableName);
        if (!consumer) {
          await sleep(5000);
          continue;
        }

        const batch = await consumer.fetch({ max_messages: 10, expires: 5000 });

        for await (const msg of batch) {
          if (cancelled) break;
          await this.handleMessage(msg, queue, poisonTracker);
        }
      } catch (err: unknown) {
        if (cancelled) break;
        const errMsg = (err as Error).message ?? String(err);
        if (!errMsg.includes('TIMEOUT') && !errMsg.includes('fetch')) {
          this.logger.warn(`[${queueName}] pull error: ${errMsg}`);
        }
        await sleep(2000);
      }
    }

    this.logger.log(`Worker loop stopped for queue "${queueName}"`);
    this.activeLoops.delete(loopKey);
  }

  private async handleMessage(
    msg: JsMsg,
    queue: { id: string; projectId: string; name: string; deadLetterQueue: string | null; retryDelaySeconds: number | null; retryAttempts: number | null },
    poisonTracker: Map<number, number>,
  ): Promise<void> {
    const seq = msg.seq;

    let payload: QueueMessagePayload;
    try {
      payload = JSON.parse(new TextDecoder().decode(msg.data));
    } catch {
      this.logger.error(`[${queue.name}] Malformed JSON seq=${seq}, moving to DLQ`);
      const fallbackPayload: QueueMessagePayload = {
        body: new TextDecoder().decode(msg.data),
        headers: {},
        projectId: queue.projectId,
        queueName: queue.name,
      };
      await this.moveToDlq(queue, fallbackPayload, 'malformed JSON');
      msg.ack();
      return;
    }

    // Target routing: check JetStream message headers first (set by producer),
    // then fall back to JSON body headers (for backward compat).
    const jsHeaders: Record<string, string> = {};
    if (msg.headers) {
      for (const [k, v] of msg.headers) {
        jsHeaders[k] = Array.isArray(v) ? v[0] : v;
      }
    }

    const rawUrl = jsHeaders['x-target-url'] ?? (payload.headers as Record<string, string>)?.['x-target-url'];
    const rawFnId = jsHeaders['x-target-function-id'] ?? (payload.headers as Record<string, string>)?.['x-target-function-id'];
    const target: QueueTarget = {
      type: (jsHeaders['x-target-type'] as QueueTarget['type'])
        ?? (payload.headers as Record<string, string>)?.['x-target-type'] as QueueTarget['type']
        ?? 'internal',
      url: rawUrl || undefined,
      functionId: rawFnId || undefined,
    };

    try {
      await this.dispatch(target, payload);
      this.eventService.emit('queues.invocation.succeeded', queue.projectId, {
        queueId: queue.id,
        sequence: seq,
      });
      // Update Prisma audit trail to reflect JetStream acknowledgment.
      await this.prisma.queueMessage.updateMany({
        where: { queueId: queue.id, jetStreamSeq: BigInt(seq) },
        data: { status: 'acknowledged', acknowledgedAt: new Date() },
      });
      msg.ack();
      poisonTracker.delete(seq);
      this.logger.debug(`[${queue.name}] seq=${seq} dispatched successfully`);
    } catch (err: unknown) {
      const errMsg = (err as Error).message ?? String(err);
      const attempts = (poisonTracker.get(seq) ?? 0) + 1;
      poisonTracker.set(seq, attempts);

      if (attempts >= (queue.retryAttempts ?? 3)) {
        this.logger.warn(`[${queue.name}] seq=${seq} exceeded max attempts (${attempts}), moving to DLQ`);
        await this.moveToDlq(queue, payload, `max attempts exceeded: ${errMsg}`);
        this.eventService.emit('queues.invocation.failed', queue.projectId, {
          queueId: queue.id,
          sequence: seq,
          error: errMsg,
        });
        msg.ack();
      } else {
        this.logger.warn(`[${queue.name}] seq=${seq} attempt ${attempts} failed: ${errMsg}`);
        msg.nak();
      }
    }
  }

  private async dispatch(target: QueueTarget, payload: QueueMessagePayload): Promise<void> {
    switch (target.type) {
      case 'http': {
        if (!target.url) throw new Error('HTTP target missing URL');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);
        try {
          const res = await fetch(target.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(
                Object.entries(payload.headers)
                  .filter(([k]) => k.startsWith('x-'))
                  .map(([k, v]) => [k, v]),
              ),
            },
            body: payload.body,
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        } finally {
          clearTimeout(timer);
        }
        break;
      }

      case 'function': {
        if (!target.functionId) throw new Error('Function target missing functionId');
        this.eventService.emit('queues.function.dispatch', payload.projectId, {
          functionId: target.functionId,
          payload: JSON.parse(payload.body),
          sourceQueue: payload.queueName,
        });
        this.logger.debug(`[function] dispatched to ${target.functionId}`);
        break;
      }

      case 'internal':
      default:
        this.logger.debug(`[internal] queue=${payload.queueName} body=${(payload.body || '').slice(0, 80)}`);
        break;
    }
  }

  private async moveToDlq(
    queue: { id: string; projectId: string; name: string; deadLetterQueue: string | null },
    payload: QueueMessagePayload,
    reason: string,
  ): Promise<void> {
    const dlqName = queue.deadLetterQueue ?? `${queue.name}_dlq`;

    let dlq = await this.prisma.queue.findFirst({
      where: { projectId: queue.projectId, name: dlqName },
    });
    if (!dlq) {
      dlq = await this.prisma.queue.create({
        data: { projectId: queue.projectId, name: dlqName, type: 'deadletter', status: 'active' },
      });
    }

    await this.prisma.queueMessage.create({
      data: {
        queueId: dlq.id,
        body: payload.body,
        headers: { ...payload.headers, dlq_reason: reason, original_queue: queue.name },
        status: 'dead_lettered',
        attempts: 0,
      },
    });

    try {
      await this.jsQueue.publish(queue.projectId, dlqName, payload.body, {
        ...payload.headers,
        'x-original-queue': queue.name,
        'x-dlq-reason': reason,
      });
    } catch { /* ignore publish failures for poison messages */ }

    this.eventService.emit('queues.message.dead_lettered', queue.projectId, {
      queueId: queue.id,
      dlqId: dlq.id,
      reason,
    });
  }

  async stop(): Promise<void> {
    this.logger.log('Stopping all queue worker loops...');
    for (const { cancel } of this.activeLoops.values()) {
      cancel();
    }
    this.activeLoops.clear();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
