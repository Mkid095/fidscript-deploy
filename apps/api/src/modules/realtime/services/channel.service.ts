import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { ChannelStateService } from './channel-state.service';
import { ChannelEventsService } from './channel-events.service';
import { ChannelStateOpsService } from './channel-state-ops.service';
import { PresenceService } from './presence.service';

@Injectable()
export class ChannelService {
  private server: Server | null = null;

  constructor(
    private prisma: PrismaService,
    private channelState: ChannelStateService,
    private channelEvents: ChannelEventsService,
    private stateOps: ChannelStateOpsService,
    private presenceService: PresenceService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    this.channelState.setServer(server);
  }

  registerSocket(userId: string, projectId: string, socketId: string): void {
    this.stateOps.registerSocket(userId, projectId, socketId);
  }

  async handleDisconnect(userId: string, projectId: string, socketId: string): Promise<void> {
    return this.stateOps.handleDisconnect(userId, projectId, socketId, this.server!);
  }

  async joinChannel(client: Socket, userId: string, projectId: string, channelId: string): Promise<{ success: boolean; error?: string }> {
    const channel = await this.prisma.realtimeChannel.findFirst({ where: { id: channelId, projectId } });
    if (!channel) return { success: false, error: 'Channel not found' };

    this.channelState.addClientToChannel(client, userId, projectId, channelId);
    await this.presenceService.updatePresence(userId, 'online');
    await this.presenceService.updateChannelPresence(channelId, userId, 'online');

    await this.channelEvents.emitClientJoined(this.server!, channelId, userId, projectId, client);
    const presence = this.channelState.getChannelPresence(channelId);
    client.emit('presence', { channelId, users: presence });

    return { success: true };
  }

  async leaveChannel(client: Socket, userId: string, projectId: string, channelId: string): Promise<{ success: boolean }> {
    client.leave(channelId);
    this.channelState.removeClientFromChannel(client, channelId);
    await this.presenceService.updatePresence(userId, 'offline');
    await this.presenceService.updateChannelPresence(channelId, userId, 'offline');
    await this.channelEvents.emitClientLeft(this.server!, channelId, userId, projectId, client.id);
    return { success: true };
  }

  async handleMessage(server: Server, userId: string, projectId: string, channelId: string, content: string, event: string, socketId: string): Promise<{ success: boolean; messageId: string }> {
    if (!this.channelState.isClientInChannel(socketId, channelId)) {
      return { success: false, messageId: '' };
    }

    const message = {
      id: crypto.randomUUID(),
      channelId,
      userId,
      content,
      event: event || 'message',
      timestamp: new Date().toISOString(),
    };

    server.to(channelId).emit(event || 'message', message);
    await this.channelEvents.emitMessage(server, channelId, userId, projectId, message.id);

    return { success: true, messageId: message.id };
  }

  getChannelPresence(channelId: string) {
    return this.stateOps.getChannelPresence(channelId);
  }

  getAllChannelClients() {
    return this.stateOps.getAllChannelClients();
  }

  async deleteChannel(channelId: string, projectId: string): Promise<{ deleted: boolean }> {
    return this.stateOps.deleteChannel(channelId, projectId, this.server!);
  }
}
