import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { EventService } from '../../events/event.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

interface ChannelClient {
  socketId: string;
  userId: string;
  projectId: string;
  channelId: string;
  joinedAt: Date;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private channelClients: Map<string, ChannelClient[]> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private eventService: EventService,
    private prisma: PrismaService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      // Validate token and get user info
      const validateResult = await this.validateToken(token);
      if (!validateResult) {
        client.disconnect();
        return;
      }

      client.data.userId = validateResult.userId;
      client.data.projectId = validateResult.projectId;

      if (!this.userSockets.has(validateResult.userId)) {
        this.userSockets.set(validateResult.userId, new Set());
      }
      this.userSockets.get(validateResult.userId)!.add(client.id);

      client.emit('connected', { socketId: client.id });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          await this.updatePresence(userId, 'offline');
        }
      }

      // Remove from all channels
      for (const [channelId, clients] of this.channelClients.entries()) {
        const idx = clients.findIndex(c => c.socketId === client.id);
        if (idx !== -1) {
          const channelClient = clients[idx];
          clients.splice(idx, 1);

          this.server.to(channelId).emit('client_left', {
            channelId,
            userId,
            socketId: client.id,
          });

          await this.eventService.emit('realtime.client_left', {
            channelId,
            userId,
            projectId,
          });
        }
      }
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; token?: string },
  ) {
    const { channelId, token } = data;
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    // Verify channel exists and user has access
    const channel = await this.prisma.realtimeChannel.findFirst({
      where: { id: channelId, projectId },
    });

    if (!channel) {
      client.emit('error', { message: 'Channel not found' });
      return;
    }

    if (channel.isPrivate && token) {
      // Validate private channel token
      const isValid = await this.validateChannelToken(channelId, userId, token);
      if (!isValid) {
        client.emit('error', { message: 'Invalid channel token' });
        return;
      }
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
    await this.updatePresence(userId, 'online');
    await this.persistPresence(channelId, userId, 'online');

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

    return { channelId, success: true };
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    client.leave(channelId);

    const clients = this.channelClients.get(channelId) || [];
    const idx = clients.findIndex(c => c.socketId === client.id);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }

    await this.updatePresence(userId, 'offline');
    await this.persistPresence(channelId, userId, 'offline');

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

    return { channelId, success: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string; event?: string },
  ) {
    const { channelId, content, event } = data;
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    // Verify user is in channel
    const clients = this.channelClients.get(channelId) || [];
    const isInChannel = clients.some(c => c.socketId === client.id);
    if (!isInChannel) {
      client.emit('error', { message: 'Not in channel' });
      return;
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
    this.server.to(channelId).emit(event || 'message', message);

    await this.eventService.emit('realtime.message_sent', {
      channelId,
      userId,
      projectId,
      messageId: message.id,
    });

    return { success: true, messageId: message.id };
  }

  @SubscribeMessage('set_presence')
  async handleSetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId?: string; status: string },
  ) {
    const userId = client.data.userId;
    const { channelId, status } = data;

    await this.updatePresence(userId, status as 'online' | 'away' | 'busy' | 'offline');
    if (channelId) {
      await this.persistPresence(channelId, userId, status as string);
    }

    if (channelId) {
      const presence = this.getChannelPresence(channelId);
      this.server.to(channelId).emit('presence_update', { channelId, users: presence });
    } else {
      // Broadcast to all channels user is in
      for (const [chId, clients] of this.channelClients.entries()) {
        if (clients.some(c => c.userId === userId)) {
          const presence = this.getChannelPresence(chId);
          this.server.to(chId).emit('presence_update', { channelId: chId, users: presence });
        }
      }
    }

    return { success: true };
  }

  @SubscribeMessage('get_presence')
  handleGetPresence(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    const presence = this.getChannelPresence(data.channelId);
    return { channelId: data.channelId, users: presence };
  }

  private getChannelPresence(channelId: string) {
    const clients = this.channelClients.get(channelId) || [];
    const userPresences = new Map<string, { userId: string; status: string; socketIds: string[] }>();

    for (const c of clients) {
      if (!userPresences.has(c.userId)) {
        userPresences.set(c.userId, { userId: c.userId, status: 'online', socketIds: [] });
      }
      userPresences.get(c.userId)!.socketIds.push(c.socketId);
    }

    return Array.from(userPresences.values());
  }

  /**
   * Persist and broadcast channel presence to Redis.
   * Called whenever a user's presence changes.
   */
  private async persistPresence(channelId: string, userId: string, status: string) {
    const key = `presence:channel:${channelId}:user:${userId}`;
    await this.redisService.set(key, {
      userId,
      channelId,
      status,
      updatedAt: new Date().toISOString(),
    }, 86400); // 24h TTL
  }

  private async updatePresence(userId: string, status: string) {
    // Redis for cross-instance sync; Prisma for durable storage
    const redisKey = `presence:${userId}`;
    await this.redisService.set(redisKey, { userId, status, updatedAt: new Date().toISOString() }, 3600);
  }

  private async validateToken(token: string): Promise<{ userId: string; projectId: string } | null> {
    try {
      const jwt = await import('jsonwebtoken');

      // Support JWT_SECRET_FILE Docker secret convention
      let secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        const secretFile = this.configService.get<string>('JWT_SECRET_FILE');
        if (secretFile) {
          secret = fs.readFileSync(secretFile, 'utf8').trim();
        }
      }
      if (!secret) return null;

      const decoded = jwt.default.verify(token, secret) as { userId: string; projectId?: string };

      return {
        userId: decoded.userId,
        projectId: decoded.projectId || '',
      };
    } catch {
      return null;
    }
  }

  private async validateChannelToken(channelId: string, userId: string, token: string): Promise<boolean> {
    if (!token) return false;

    const channel = await this.prisma.realtimeChannel.findUnique({
      where: { id: channelId },
      select: { accessToken: true, projectId: true },
    });
    if (!channel || !channel.accessToken) return false;

    // accessToken stored as bcrypt hash
    try {
      return await bcrypt.compare(token, channel.accessToken);
    } catch {
      return false;
    }
  }

  // Admin methods for channel management
  async createChannel(projectId: string, name: string, isPrivate = false, metadata?: Record<string, unknown>) {
    const channel = await this.prisma.realtimeChannel.create({
      data: { projectId, name, isPrivate, metadata: (metadata || {}) as any },
    });

    await this.eventService.emit('realtime.channel_created', {
      channelId: channel.id,
      projectId,
      name,
    });

    return channel;
  }

  async deleteChannel(channelId: string) {
    const channel = await this.prisma.realtimeChannel.findUnique({ where: { id: channelId } });
    if (!channel) return null;

    // Notify all clients in channel
    this.server.to(channelId).emit('channel_deleted', { channelId });

    // Remove all clients from channel
    const clients = this.channelClients.get(channelId) || [];
    for (const client of clients) {
      const socket = this.server.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.leave(channelId);
      }
    }
    this.channelClients.delete(channelId);

    await this.prisma.realtimeChannel.delete({ where: { id: channelId } });

    await this.eventService.emit('realtime.channel_deleted', {
      channelId,
      projectId: channel.projectId,
    });

    return { deleted: true };
  }
}