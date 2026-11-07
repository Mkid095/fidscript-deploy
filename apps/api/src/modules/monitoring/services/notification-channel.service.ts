import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationChannelService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

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

  /** Send a test message through the channel (no delivery record). */
  async testChannel(
    projectId: string,
    channelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const channel = await this.prisma.notificationChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Notification channel not found');
    return this.notifications.testChannel({
      id: channel.id,
      projectId: channel.projectId,
      name: channel.name,
      type: channel.type,
      config: (channel.config ?? {}) as Record<string, unknown>,
    });
  }
}
