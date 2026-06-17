import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class NotificationChannelService {
  constructor(private prisma: PrismaService) {}

  async createNotificationChannel(
    projectId: string,
    dto: { name: string; type: string; config: Record<string, any> },
  ) {
    return this.prisma.notificationChannel.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        config: dto.config,
      },
    });
  }

  async listNotificationChannels(projectId: string) {
    return this.prisma.notificationChannel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNotificationChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');
    return channel;
  }

  async updateNotificationChannel(
    projectId: string,
    channelId: string,
    dto: { name?: string; config?: Record<string, any> },
  ) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');

    return this.prisma.notificationChannel.update({
      where: { id: channelId },
      data: {
        name: dto.name ?? channel.name,
        config: (dto.config ?? channel.config) as any,
      },
    });
  }

  async deleteNotificationChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');

    await this.prisma.notificationChannel.delete({ where: { id: channelId } });
    return { deleted: true };
  }
}
