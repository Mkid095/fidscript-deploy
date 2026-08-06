import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { ProjectAccessService } from '../projects/services/project-access.service';
import { CreateChannelDto, SetPresenceDto } from './dto/index';

@Injectable()
export class RealtimeService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private access: ProjectAccessService,
  ) {}

  async createChannel(projectId: string, dto: CreateChannelDto) {
    const isPrivate = dto.isPrivate || false;

    // Auto-generate access token for private channels (return raw once, store bcrypt hash)
    let accessToken: string | undefined;
    if (isPrivate) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      accessToken = await bcrypt.hash(rawToken, 10);
    }

    const channel = await this.prisma.realtimeChannel.create({
      data: {
        projectId,
        name: dto.name,
        isPrivate,
        metadata: (dto.metadata || {}) as any,
        ...(accessToken && { accessToken }),
      },
    });

    await this.eventService.emit('realtime.channel_created', projectId, {
      channelId: channel.id,
      name: dto.name,
    });

    return channel;
  }

  async listChannels(projectId: string, userId: string) {
    await this.access.findProjectWithAccess(userId, projectId);
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

    await this.eventService.emit('realtime.channel_deleted', projectId, {
      channelId,
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
    await this.access.findProjectWithAccess(userId, projectId);
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

  async getChannelPresence(projectId: string, channelId: string, userId: string) {
    await this.access.findProjectWithAccess(userId, projectId);
    return this.prisma.realtimePresence.findMany({
      where: { projectId, channelId },
    });
  }

  async generateChannelToken(projectId: string, channelId: string, userId: string): Promise<string> {
    // Require project membership before issuing a channel-scoped secret.
    // The body of the request no longer accepts a userId — the caller must
    // be a member, and identity is bound at presentation time.
    await this.access.findProjectWithAccess(userId, projectId);
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    // Generate a secure random token, bcrypt-hash it before storing, return the raw token once
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    await this.prisma.realtimeChannel.update({
      where: { id: channelId },
      data: { accessToken: hashedToken },
    });
    return rawToken; // only returned once — user must store it
  }
}