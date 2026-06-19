import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { JetStreamQueueService } from './jetstream-queue.service';
import { CreateQueueDto, UpdateQueueDto } from '../dto/index';

@Injectable()
export class QueueCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private jsQueue: JetStreamQueueService,
  ) {}

  async createQueue(projectId: string, dto: CreateQueueDto) {
    const queue = await this.prisma.queue.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type || 'stream',
        retentionDays: dto.retentionDays || 7,
        maxMessages: dto.maxMessages || 100000,
        maxBytes: dto.maxBytes || 1073741824,
        replicas: dto.replicas || 1,
        status: 'active',
        retryAttempts: dto.retryAttempts ?? 3,
        retryDelaySeconds: dto.retryDelaySeconds ?? 60,
        deadLetterQueue: dto.deadLetterQueue,
      },
    });

    // Ensure JetStream durable consumer for this queue
    try {
      await this.jsQueue.ensureConsumer(
        projectId,
        queue.name,
        queue.retryDelaySeconds || 60,
        queue.retryAttempts || 3,
      );
    } catch (err: unknown) {
      // Non-fatal: NATS may not be connected yet (degraded mode still works via Prisma)
      this.eventService.emit('queues.consumer.setup.degraded' as any, {
        queueId: queue.id,
        projectId,
        error: (err as Error).message,
      });
    }

    await this.eventService.emit('queues.created' as any, {
      queueId: queue.id,
      projectId,
      name: dto.name,
    });

    return queue;
  }

  async listQueues(projectId: string) {
    return this.prisma.queue.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, projectId },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  async updateQueue(projectId: string, queueId: string, dto: UpdateQueueDto) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, projectId },
    });
    if (!queue) throw new NotFoundException('Queue not found');

    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        retentionDays: dto.retentionDays ?? queue.retentionDays,
        maxMessages: dto.maxMessages ?? queue.maxMessages,
        maxBytes: dto.maxBytes ?? queue.maxBytes,
        deadLetterQueue: dto.deadLetterQueue ?? queue.deadLetterQueue,
        retryAttempts: dto.retryAttempts ?? queue.retryAttempts,
        retryDelaySeconds: dto.retryDelaySeconds ?? queue.retryDelaySeconds,
      },
    });

    // Update consumer settings in JetStream to match new retry settings
    try {
      await this.jsQueue.ensureConsumer(
        projectId,
        updated.name,
        updated.retryDelaySeconds || 60,
        updated.retryAttempts || 3,
      );
    } catch { /* ignore */ }

    return updated;
  }

  async deleteQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, projectId },
    });
    if (!queue) throw new NotFoundException('Queue not found');

    // Remove JetStream durable consumer
    try {
      await this.jsQueue.deleteConsumer(queue.name);
    } catch { /* ignore if already gone */ }

    await this.prisma.queueMessage.deleteMany({ where: { queueId } });
    await this.prisma.queue.delete({ where: { id: queueId } });

    return { deleted: true };
  }
}
