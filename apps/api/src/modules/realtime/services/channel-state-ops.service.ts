import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChannelStateService } from './channel-state.service';
import { PresenceService } from './presence.service';
import { ChannelEventsService } from './channel-events.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ChannelStateOpsService {
  constructor(
    private channelState: ChannelStateService,
    private presenceService: PresenceService,
    private channelEvents: ChannelEventsService,
    private prisma: PrismaService,
  ) {}

  registerSocket(userId: string, projectId: string, socketId: string): void {
    this.channelState.registerSocket(userId, projectId, socketId);
  }

  async handleDisconnect(userId: string, projectId: string, socketId: string, server: Server): Promise<void> {
    const { userWentOffline } = await this.channelState.handleDisconnectState(userId, projectId, socketId);

    if (userWentOffline) {
      await this.presenceService.updatePresence(userId, 'offline');
    }

    const allClients = this.channelState.getAllChannelClients();
    for (const [channelId, clients] of allClients.entries()) {
      const wasInChannel = clients.some(c => c.socketId === socketId);
      if (wasInChannel) {
        await this.channelEvents.emitClientLeft(server, channelId, userId, projectId, socketId);
      }
    }
  }

  async deleteChannel(channelId: string, projectId: string, server: Server): Promise<{ deleted: boolean }> {
    const channel = await this.prisma.realtimeChannel.findUnique({ where: { id: channelId } });
    if (!channel) return { deleted: false };

    this.channelState.evictChannelClients(channelId);
    await this.channelEvents.emitChannelDeleted(server, channelId, projectId);
    await this.prisma.realtimeChannel.delete({ where: { id: channelId } });

    return { deleted: true };
  }

  getChannelPresence(channelId: string) {
    return this.channelState.getChannelPresence(channelId);
  }

  getAllChannelClients() {
    return this.channelState.getAllChannelClients();
  }
}
