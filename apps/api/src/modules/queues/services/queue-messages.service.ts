import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import {
  PublishMessageDto,
  PublishBatchDto,
  ConsumeMessageDto,
  AcknowledgeMessageDto,
  RetryMessageDto,
  MoveToDeadLetterDto,
} from '../dto/index';
import { Prisma } from '@prisma/client';

type QueueMessage = Prisma.QueueMessageGetPayload<Record<string, never>>;

@Injectable()
export class QueueMessagesService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  private async findQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, projectId },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  async publishMessage(projectId: string, queueId: string, dto: PublishMessageDto) {
    await this.findQueue(projectId, queueId);

    const body = typeof dto.body === 'string' ? dto.body : JSON.stringify(dto.body);
    const scheduledAt = dto.delaySeconds
      ? new Date(Date.now() + dto.delaySeconds * 1000)
      : new Date();

    const message = await this.prisma.queueMessage.create({
      data: {
        queueId,
        body,
        headers: dto.headers || {},
        status: 'pending',
        scheduledAt,
      },
    });

    await this.eventService.emit('queue.message_published', {
      queueId,
      messageId: message.id,
      projectId,
    });

    return { messageId: message.id, scheduledAt };
  }

  async publishBatch(projectId: string, queueId: string, dto: PublishBatchDto) {
    await this.findQueue(projectId, queueId);

    const messages = await this.prisma.$transaction(
      dto.messages.map((msg) =>
        this.prisma.queueMessage.create({
          data: {
            queueId,
            body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body),
            headers: msg.headers || {},
            status: 'pending',
            scheduledAt: new Date(),
          },
        }),
      ),
    );

    await this.eventService.emit('queue.message_published', {
      queueId,
      messageCount: messages.length,
      projectId,
    });

    return { messageIds: messages.map((m) => m.id), count: messages.length };
  }

  async consumeMessages(projectId: string, queueId: string, dto: ConsumeMessageDto) {
    await this.findQueue(projectId, queueId);

    const maxMessages = dto.maxMessages || 10;
    const timeoutMs = (dto.timeoutSeconds || 30) * 1000;

    const messages = await this.prisma.queueMessage.findMany({
      where: {
        queueId,
        status: 'pending',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: maxMessages,
    });

    // Mark messages as delivered
    await this.prisma.queueMessage.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    return {
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        headers: m.headers,
        attempts: m.attempts,
        deliveredAt: m.deliveredAt,
      })),
      count: messages.length,
    };
  }

  async acknowledgeMessages(projectId: string, queueId: string, dto: AcknowledgeMessageDto) {
    await this.findQueue(projectId, queueId);

    await this.prisma.queueMessage.updateMany({
      where: { id: { in: dto.messageIds } },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });

    return { acknowledged: dto.messageIds.length };
  }

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

    await this.eventService.emit('queue.message_retried', {
      queueId,
      messageIds: dto.messageIds,
      projectId,
    });

    return { retried: dto.messageIds.length };
  }

  async moveToDeadLetter(projectId: string, queueId: string, dto: MoveToDeadLetterDto) {
    const queue = await this.findQueue(projectId, queueId);

    const dlqName = queue.deadLetterQueue || `${queue.name}_dlq`;
    let dlq = await this.prisma.queue.findFirst({
      where: { projectId, name: dlqName },
    });

    if (!dlq) {
      dlq = await this.prisma.queue.create({
        data: {
          projectId,
          name: dlqName,
          type: 'deadletter',
          status: 'active',
        },
      });
    }

    const messages = await this.prisma.queueMessage.findMany({
      where: { id: { in: dto.messageIds } },
    });

    await this.prisma.$transaction([
      this.prisma.queueMessage.updateMany({
        where: { id: { in: dto.messageIds } },
        data: { status: 'dead_lettered' },
      }),
      ...messages.map((m) =>
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

    await this.eventService.emit('queue.dead_lettered', {
      queueId,
      dlqId: dlq.id,
      messageIds: dto.messageIds,
      projectId,
    });

    return { moved: dto.messageIds.length, dlqId: dlq.id };
  }

  async getQueueMessages(
    projectId: string,
    queueId: string,
    status?: string,
    limit = 50,
    cursor?: string,
  ) {
    await this.findQueue(projectId, queueId);

    const where: Prisma.QueueMessageWhereInput = { queueId };
    if (status) where.status = status;

    const messages = await this.prisma.queueMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return {
      messages: messages.reverse(),
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null,
    };
  }

  async getQueueStats(projectId: string, queueId: string) {
    await this.findQueue(projectId, queueId);

    const [pending, delivered, acknowledged, failed, deadLettered] = await Promise.all([
      this.prisma.queueMessage.count({ where: { queueId, status: 'pending' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'delivered' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'acknowledged' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'failed' } }),
      this.prisma.queueMessage.count({ where: { queueId, status: 'dead_lettered' } }),
    ]);

    return {
      queueId,
      pending,
      delivered,
      acknowledged,
      failed,
      deadLettered,
      total: pending + delivered + acknowledged + failed + deadLettered,
    };
  }
}
