import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { JetStreamQueueService } from './jetstream-queue.service';
import { ConsumeMessageDto, AcknowledgeMessageDto, RetryMessageDto, MoveToDeadLetterDto } from '@/modules/queues/dto/index';
import { Prisma } from '@prisma/client';

@Injectable()
export class QueueConsumerService {
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
   * consumeMessages — the HTTP long-poll endpoint.
   * Messages are delivered by the server-side worker (JetStream pull consumer).
   * This endpoint is retained for SDK compatibility / manual inspection of pending messages.
   * Returns messages from Prisma (the audit trail), not JetStream directly.
   */
  async consumeMessages(projectId: string, queueId: string, dto: ConsumeMessageDto) {
    const queue = await this.findQueue(projectId, queueId);
    const maxMessages = dto.maxMessages || 10;

    // Messages are in 'pending' in Prisma (published but not yet delivered by worker)
    // or 'delivered' (in-flight). Only pending messages are returned here.
    const messages = await this.prisma.queueMessage.findMany({
      where: { queueId, status: 'pending', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: maxMessages,
    });

    await this.prisma.queueMessage.updateMany({
      where: { id: { in: messages.map(m => m.id) } },
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    return {
      messages: messages.map(m => ({ id: m.id, body: m.body, headers: m.headers, attempts: m.attempts, deliveredAt: m.deliveredAt })),
      count: messages.length,
      note: 'For auto-delivery, use JetStream pull consumers. This endpoint is for manual inspection.',
    };
  }

  /**
   * acknowledgeMessages — mark messages as acked in Prisma.
   * The actual JetStream ack is done by QueueWorkerService when it processes the message.
   * This endpoint exists for SDK compatibility.
   */
  async acknowledgeMessages(projectId: string, queueId: string, dto: AcknowledgeMessageDto) {
    await this.findQueue(projectId, queueId);
    await this.prisma.queueMessage.updateMany({
      where: { id: { in: dto.messageIds } },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
    await this.eventService.emit('queues.message.acknowledged' as any, {
      queueId,
      messageIds: dto.messageIds,
      projectId,
    });
    return { acknowledged: dto.messageIds.length };
  }

  /**
   * retryMessages — reset messages to pending for re-delivery.
   */
  async retryMessages(projectId: string, queueId: string, dto: RetryMessageDto) {
    const queue = await this.findQueue(projectId, queueId);
    const retryDelay = queue.retryDelaySeconds || 60;
    await this.prisma.queueMessage.updateMany({
      where: { id: { in: dto.messageIds } },
      data: {
        status: 'pending',
        attempts: { increment: 1 },
        scheduledAt: new Date(Date.now() + retryDelay * 1000),
        errorMessage: null,
      },
    });
    await this.eventService.emit('queues.message.retried' as any, {
      queueId,
      messageIds: dto.messageIds,
      projectId,
    });
    return { retried: dto.messageIds.length };
  }

  /**
   * moveToDeadLetter — move messages to the DLQ (Prisma + JetStream).
   */
  async moveToDeadLetter(projectId: string, queueId: string, dto: MoveToDeadLetterDto) {
    const queue = await this.findQueue(projectId, queueId);
    const dlqName = queue.deadLetterQueue || `${queue.name}_dlq`;

    let dlq = await this.prisma.queue.findFirst({ where: { projectId, name: dlqName } });
    if (!dlq) {
      dlq = await this.prisma.queue.create({
        data: { projectId, name: dlqName, type: 'deadletter', status: 'active' },
      });
    }

    const messages = await this.prisma.queueMessage.findMany({ where: { id: { in: dto.messageIds } } });

    await this.prisma.$transaction([
      this.prisma.queueMessage.updateMany({
        where: { id: { in: dto.messageIds } },
        data: { status: 'dead_lettered' },
      }),
      ...messages.map(m =>
        this.prisma.queueMessage.create({
          data: {
            queueId: dlq.id,
            body: m.body,
            headers: { ...(m.headers as Record<string, string>), originalQueueId: queueId, reason: dto.reason || 'failed' },
            status: 'pending',
            scheduledAt: new Date(),
          },
        }),
      ),
    ]);

    // Also publish to the DLQ JetStream subject
    await Promise.allSettled(
      messages.map(m =>
        this.jsQueue.publish(projectId, dlq.name, m.body, {
          'x-original-queue': queue.name,
          'x-dlq-reason': dto.reason || 'failed',
        }),
      ),
    );

    await this.eventService.emit('queues.message.dead_lettered' as any, {
      queueId,
      dlqId: dlq.id,
      messageIds: dto.messageIds,
      projectId,
    });
    return { moved: dto.messageIds.length, dlqId: dlq.id };
  }

  /**
   * getQueueMessages — Prisma-backed for audit, with optional status filter.
   */
  async getQueueMessages(projectId: string, queueId: string, status?: string, limit = 50, cursor?: string) {
    await this.findQueue(projectId, queueId);
    const where: Prisma.QueueMessageWhereInput = { queueId };
    if (status) where.status = status;

    const messages = await this.prisma.queueMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    return { messages: messages.reverse(), nextCursor: hasMore ? messages[messages.length - 1]?.id : null };
  }

  /**
   * getQueueStats — real JetStream depth + Prisma breakdown.
   * JetStream is authoritative for pending/delivered counts.
   */
  async getQueueStats(projectId: string, queueId: string) {
    const queue = await this.findQueue(projectId, queueId);

    // Get real JetStream consumer stats
    const { messages: jsDepth } = await this.jsQueue.getStreamStats(projectId, queue.name);

    // Prisma breakdown for audit/UI
    const [pending, delivered, acknowledged, failed, deadLettered] = await Promise.all([
      this.prisma.queueMessage.count({ where: { queueId, status: 'pending' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'delivered' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'acknowledged' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'failed' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'dead_lettered' } }),
    ]);

    return {
      queueId,
      jsDepth,          // JetStream authoritative count
      pending,
      delivered,
      acknowledged,
      failed,
      deadLettered,
      total: pending + delivered + acknowledged + failed + deadLettered,
    };
  }
}
