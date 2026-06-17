import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from "crypto";
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { CreateChannelDto, SetPresenceDto } from './dto/index';

@Injectable()
export class RealtimeService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createChannel(projectId: string, dto: CreateChannelDto) {
    const channel = await this.prisma.realtimeChannel.create({
      data: {
        projectId,
        name: dto.name,
        isPrivate: dto.isPrivate || false,
        metadata: (dto.metadata || {}) as any,
      },
    });

    await this.eventService.emit('realtime.channel_created', {
      channelId: channel.id,
      projectId,
      name: dto.name,
    });

    return channel;
  }

  async listChannels(projectId: string) {
    return this.prisma.realtimeChannel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async deleteChannel(projectId: string, channelId: string) {
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    await this.prisma.realtimeChannel.delete({ where: { id: channelId } });

    await this.eventService.emit('realtime.channel_deleted', {
      channelId,
      projectId,
    });

    return { deleted: true };
  }

  async getChannelMessages(projectId: string, channelId: string, limit = 50, cursor?: string) {
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const messages = await this.prisma.realtimeMessage.findMany({
      where: { channelId },
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

  async setUserPresence(projectId: string, userId: string, dto: SetPresenceDto) {
    const presence = await this.prisma.realtimePresence.upsert({
      where: { projectId_userId_channelId: {
        projectId,
        userId,
        channelId: dto.channelId,
      }},
      create: {
        projectId,
        userId,
        channelId: dto.channelId,
        status: dto.status,
      },
      update: { status: dto.status },
    });

    return presence;
  }

  async getChannelPresence(projectId: string, channelId: string) {
    return this.prisma.realtimePresence.findMany({
      where: { projectId, channelId },
    });
  }

  async generateChannelToken(channelId: string, userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.realtimeChannel.update({
      where: { id: channelId },
      data: { accessToken: token },
    });
    return token;
  }
}