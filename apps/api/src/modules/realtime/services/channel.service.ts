import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { ChannelStateService } from './channel-state.service';
import { ChannelEventsService } from './channel-events.service';
import { PresenceService } from './presence.service';

@Injectable()
export class ChannelService {
  private server: Server | null = null;

  constructor(
    private prisma: PrismaService,
    private channelState: ChannelStateService,
    private channelEvents: ChannelEventsService,
    private presenceService: PresenceService,
  ) {}

  /**
   * Called by the gateway after the WebSocket server is initialized.
   * Must be called before handling any channel events.
   */
  setServer(server: Server): void {
    this.server = server;
    this.channelState.setServer(server);
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  registerSocket(userId: string, projectId: string, socketId: string): void {
    this.channelState.registerSocket(userId, projectId, socketId);
  }

  async handleDisconnect(
    userId: string,
    projectId: string,
    socketId: string,
  ): Promise<void> {
    // Update in-memory state; check if user went offline
    const { userWentOffline } = await this.channelState.handleDisconnectState(
      userId,
      projectId,
      socketId,
    );

    if (userWentOffline) {
      await this.presenceService.updatePresence(userId, 'offline');
    }

    // Emit client_left for each channel the socket was in
    const allClients = this.channelState.getAllChannelClients();
    for (const [channelId, clients] of allClients.entries()) {
      const wasInChannel = clients.some(c => c.socketId === socketId);
      if (wasInChannel) {
        await this.channelEvents.emitClientLeft(
          this.server!,
          channelId,
          userId,
          projectId,
          socketId,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Channel operations
  // -------------------------------------------------------------------------

  async joinChannel(
    client: Socket,
    userId: string,
    projectId: string,
    channelId: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Verify channel exists and user has access
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });

    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    // Update state
    this.channelState.addClientToChannel(client, userId, projectId, channelId);

    // Update presence
    await this.presenceService.updatePresence(userId, 'online');
    await this.presenceService.updateChannelPresence(channelId, userId, 'online');

    // Emit events
    await this.channelEvents.emitClientJoined(
      this.server!,
      channelId,
      userId,
      projectId,
      client,
    );

    // Send current presence
    const presence = this.channelState.getChannelPresence(channelId);
    client.emit('presence', { channelId, users: presence });

    return { success: true };
  }

  async leaveChannel(
    client: Socket,
    userId: string,
    projectId: string,
    channelId: string,
  ): Promise<{ success: boolean }> {
    client.leave(channelId);

    this.channelState.removeClientFromChannel(client, channelId);

    await this.presenceService.updatePresence(userId, 'offline');
    await this.presenceService.updateChannelPresence(channelId, userId, 'offline');

    await this.channelEvents.emitClientLeft(
      this.server!,
      channelId,
      userId,
      projectId,
      client.id,
    );

    return { success: true };
  }

  async handleMessage(
    server: Server,
    userId: string,
    projectId: string,
    channelId: string,
    content: string,
    event: string,
    socketId: string,
  ): Promise<{ success: boolean; messageId: string }> {
    // Verify user is in this channel
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

    // Broadcast to channel
    server.to(channelId).emit(event || 'message', message);

    await this.channelEvents.emitMessage(
      server,
      channelId,
      userId,
      projectId,
      message.id,
    );

    return { success: true, messageId: message.id };
  }

  // -------------------------------------------------------------------------
  // Presence queries
  // -------------------------------------------------------------------------

  getChannelPresence(channelId: string) {
    return this.channelState.getChannelPresence(channelId);
  }

  getAllChannelClients() {
    return this.channelState.getAllChannelClients();
  }

  // -------------------------------------------------------------------------
  // Admin channel operations
  // -------------------------------------------------------------------------

  async deleteChannel(
    channelId: string,
    projectId: string,
  ): Promise<{ deleted: boolean }> {
    const channel = await this.prisma.realtimeChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) return { deleted: false };

    // Evict all clients from channel state
    this.channelState.evictChannelClients(channelId);

    // Emit deletion event
    await this.channelEvents.emitChannelDeleted(this.server!, channelId, projectId);

    await this.prisma.realtimeChannel.delete({ where: { id: channelId } });

    return { deleted: true };
  }
}
