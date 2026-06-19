import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { JetStreamQueueService } from './jetstream-queue.service';
import { PublishMessageDto, PublishBatchDto } from '@/modules/queues/dto/index';

@Injectable()
export class QueueProducerService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private jsQueue: JetStreamQueueService,
  ) {}

  private async findQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({ where: { id: queueId, projectId } });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  /**
   * Publish a message to JetStream and record in Prisma for audit/stats.
   * The Prisma record is the audit trail; JetStream is the source of truth for delivery.
   */
  async publishMessage(projectId: string, queueId: string, dto: PublishMessageDto) {
    const queue = await this.findQueue(projectId, queueId);
    const body = typeof dto.body === 'string' ? dto.body : JSON.stringify(dto.body);
    const scheduledAt = dto.delaySeconds ? new Date(Date.now() + dto.delaySeconds * 1000) : new Date();

    // Enrich headers with target info (set by SDK/API caller via x-target-* headers,
    // or defaults to internal)
    const headers: Record<string, string> = {
      ...(dto.headers ?? {}),
      'x-target-type': dto.headers?.['x-target-type'] ?? 'internal',
      'x-target-url': dto.headers?.['x-target-url'] ?? '',
      'x-target-function-id': dto.headers?.['x-target-function-id'] ?? '',
    };

    let jsSeq = 0;
    try {
      // Publish to JetStream (source of truth for delivery)
      const result = await this.jsQueue.publish(projectId, queue.name, body, headers, dto.delaySeconds);
      jsSeq = result.seq;
    } catch (err: unknown) {
      // If JetStream is unavailable (e.g. NATS not connected), fall back to
      // Prisma-only mode so queues still work in dev / degraded environments.
      this.eventService.emit('queues.publish.degraded' as any, {
        queueId,
        projectId,
        error: (err as Error).message,
      });
    }

    // Record in Prisma for metadata/audit (JetStream is still authoritative)
    const message = await this.prisma.queueMessage.create({
      data: {
        queueId,
        body,
        headers: headers,
        status: 'pending',
        scheduledAt,
        // Store JetStream seq in errorMessage field as a marker (not ideal but works)
        errorMessage: jsSeq ? `js_seq:${jsSeq}` : 'degraded_js_offline',
      },
    });

    this.eventService.emit('queues.message.published' as any, {
      queueId,
      messageId: message.id,
      projectId,
      jsSeq,
    });

    return { messageId: message.id, jsSeq, scheduledAt };
  }

  /**
   * Batch publish — each message goes to JetStream individually.
   */
  async publishBatch(projectId: string, queueId: string, dto: PublishBatchDto) {
    const queue = await this.findQueue(projectId, queueId);

    const results = await Promise.allSettled(
      dto.messages.map(async (msg) => {
        const body = typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body);
        const headers = { ...(msg.headers ?? {}) };

        let jsSeq = 0;
        try {
          const r = await this.jsQueue.publish(projectId, queue.name, body, headers);
          jsSeq = r.seq;
        } catch { /* degraded */ }

        return this.prisma.queueMessage.create({
          data: {
            queueId,
            body,
            headers,
            status: 'pending',
            scheduledAt: new Date(),
            errorMessage: jsSeq ? `js_seq:${jsSeq}` : 'degraded_js_offline',
          },
        });
      }),
    );

    const messages = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<{ id: string }>).value);

    this.eventService.emit('queues.message.published' as any, {
      queueId,
      messageCount: messages.length,
      projectId,
    });

    return { messageIds: messages.map(m => m.id), count: messages.length };
  }
}
