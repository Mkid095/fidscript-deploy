import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PublishMessageDto, PublishBatchDto } from '@/modules/queues/dto/index';

@Injectable()
export class QueueProducerService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  private async findQueue(projectId: string, queueId: string) {
    const queue = await this.prisma.queue.findFirst({ where: { id: queueId, projectId } });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  async publishMessage(projectId: string, queueId: string, dto: PublishMessageDto) {
    await this.findQueue(projectId, queueId);
    const body = typeof dto.body === 'string' ? dto.body : JSON.stringify(dto.body);
    const scheduledAt = dto.delaySeconds ? new Date(Date.now() + dto.delaySeconds * 1000) : new Date();

    const message = await this.prisma.queueMessage.create({
      data: { queueId, body, headers: dto.headers || {}, status: 'pending', scheduledAt },
    });

    await this.eventService.emit('queue.message_published', { queueId, messageId: message.id, projectId });
    return { messageId: message.id, scheduledAt };
  }

  async publishBatch(projectId: string, queueId: string, dto: PublishBatchDto) {
    await this.findQueue(projectId, queueId);

    const messages = await this.prisma.$transaction(
      dto.messages.map(msg =>
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

    await this.eventService.emit('queue.message_published', { queueId, messageCount: messages.length, projectId });
    return { messageIds: messages.map(m => m.id), count: messages.length };
  }
}
