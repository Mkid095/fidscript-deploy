import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CreateQueueDto, UpdateQueueDto } from '../dto/index';

@Injectable()
export class QueueCrudService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
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
      },
    });

    await this.eventService.emit('queue.created', {
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

    return this.prisma.queue.update({
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
  }

  async deleteQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id: queueId, projectId },
    });
    if (!queue) throw new NotFoundException('Queue not found');

    await this.prisma.queue.delete({ where: { id: queueId } });
    await this.prisma.queueMessage.deleteMany({ where: { queueId } });

    return { deleted: true };
  }
}
