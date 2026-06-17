import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { PresenceService } from './presence.service';

export interface ChannelClient {
  socketId: string;
  userId: string;
  projectId: string;
  channelId: string;
  joinedAt: Date;
}

@Injectable()
export class ChannelService {
  // In-memory state — keyed by channelId
  private channelClients: Map<string, ChannelClient[]> = new Map();
  // In-memory state — keyed by userId, set of socket IDs
  private userSockets: Map<string, Set<string>> = new Map();

  private server: Server | null = null;

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private presenceService: PresenceService,
  ) {}

  /**
   * Called by the gateway after the WebSocket server is initialized.
   * Must be called before handling any channel events.
   */
  setServer(server: Server): void {
    this.server = server;
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  registerSocket(userId: string, projectId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  async handleDisconnect(userId: string, projectId: string, socketId: string): Promise<void> {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.presenceService.updatePresence(userId, 'offline');
      }
    }

    // Remove from all channels and notify
    for (const [channelId, clients] of this.channelClients.entries()) {
      const idx = clients.findIndex(c => c.socketId === socketId);
      if (idx !== -1) {
        clients.splice(idx, 1);

        this.server?.to(channelId).emit('client_left', {
          channelId,
          userId,
          socketId,
        });

        await this.eventService.emit('realtime.client_left', {
          channelId,
          userId,
          projectId,
        });
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

    // Join the socket room
    client.join(channelId);

    // Track client in channel
    if (!this.channelClients.has(channelId)) {
      this.channelClients.set(channelId, []);
    }
    this.channelClients.get(channelId)!.push({
      socketId: client.id,
      userId,
      projectId,
      channelId,
      joinedAt: new Date(),
    });

    // Update presence
    await this.presenceService.updatePresence(userId, 'online');
    await this.presenceService.updateChannelPresence(channelId, userId, 'online');

    // Notify channel members
    client.to(channelId).emit('client_joined', {
      channelId,
      userId,
      socketId: client.id,
    });

    await this.eventService.emit('realtime.client_joined', {
      channelId,
      userId,
      projectId,
    });

    // Send current presence
    const presence = this.getChannelPresence(channelId);
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

    const clients = this.channelClients.get(channelId) || [];
    const idx = clients.findIndex(c => c.socketId === client.id);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }

    await this.presenceService.updatePresence(userId, 'offline');
    await this.presenceService.updateChannelPresence(channelId, userId, 'offline');

    client.to(channelId).emit('client_left', {
      channelId,
      userId,
      socketId: client.id,
    });

    await this.eventService.emit('realtime.client_left', {
      channelId,
      userId,
      projectId,
    });

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
    const clients = this.channelClients.get(channelId) || [];
    const isInChannel = clients.some(c => c.socketId === socketId);
    if (!isInChannel) {
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

    await this.eventService.emit('realtime.message_sent', {
      channelId,
      userId,
      projectId,
      messageId: message.id,
    });

    return { success: true, messageId: message.id };
  }

  // -------------------------------------------------------------------------
  // Presence queries
  // -------------------------------------------------------------------------

  getChannelPresence(channelId: string) {
    const clients = this.channelClients.get(channelId) || [];
    return this.presenceService.buildChannelPresence(clients);
  }

  /**
   * Returns all channel client maps for iterating in set_presence.
   */
  getAllChannelClients(): Map<string, ChannelClient[]> {
    return this.channelClients;
  }

  // -------------------------------------------------------------------------
  // Admin channel operations
  // -------------------------------------------------------------------------

  async deleteChannel(channelId: string, projectId: string): Promise<{ deleted: boolean }> {
    const channel = await this.prisma.realtimeChannel.findUnique({ where: { id: channelId } });
    if (!channel) return { deleted: false };

    // Notify all clients in channel
    this.server?.to(channelId).emit('channel_deleted', { channelId });

    // Remove all clients from channel
    const clients = this.channelClients.get(channelId) || [];
    for (const client of clients) {
      const socket = this.server?.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.leave(channelId);
      }
    }
    this.channelClients.delete(channelId);

    await this.prisma.realtimeChannel.delete({ where: { id: channelId } });

    await this.eventService.emit('realtime.channel_deleted', {
      channelId,
      projectId,
    });

    return { deleted: true };
  }
}
