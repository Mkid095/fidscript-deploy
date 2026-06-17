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
import { ChannelService } from '@/modules/realtime/services/channel.service';
import { PresenceService } from '@/modules/realtime/services/presence.service';
import { TokenService } from '@/modules/realtime/services/token.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private channelService: ChannelService,
    private presenceService: PresenceService,
    private tokenService: TokenService,
  ) {}

  onModuleInit() {
    // Wire the WebSocket server into ChannelService for broadcast operations
    this.channelService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.tokenService.validateJwt(token);
      if (!payload) {
        client.disconnect();
        return;
      }

      client.data.userId = payload.userId;
      client.data.projectId = payload.projectId;

      this.channelService.registerSocket(payload.userId, payload.projectId, client.id);

      client.emit('connected', { socketId: client.id });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    if (userId) {
      await this.channelService.handleDisconnect(userId, projectId, client.id);
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

    // Verify private channel token if provided
    if (token) {
      const valid = await this.tokenService.validateChannelToken(channelId, userId, token);
      if (!valid) {
        client.emit('error', { message: 'Invalid channel token' });
        return;
      }
    }

    const result = await this.channelService.joinChannel(client, userId, projectId, channelId);

    if (!result.success && result.error) {
      client.emit('error', { message: result.error });
      return;
    }

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

    const result = await this.channelService.leaveChannel(client, userId, projectId, channelId);
    return { channelId, success: result.success };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string; event?: string },
  ) {
    const { channelId, content, event } = data;
    const userId = client.data.userId;
    const projectId = client.data.projectId;

    const result = await this.channelService.handleMessage(
      this.server,
      userId,
      projectId,
      channelId,
      content,
      event || 'message',
      client.id,
    );

    if (!result.success) {
      client.emit('error', { message: 'Not in channel' });
      return;
    }

    return { success: true, messageId: result.messageId };
  }

  @SubscribeMessage('set_presence')
  async handleSetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId?: string; status: string },
  ) {
    const userId = client.data.userId;
    const { channelId, status } = data;

    await this.presenceService.updatePresence(userId, status);
    if (channelId) {
      await this.presenceService.updateChannelPresence(channelId, userId, status);
    }

    if (channelId) {
      const presence = this.channelService.getChannelPresence(channelId);
      this.server.to(channelId).emit('presence_update', { channelId, users: presence });
    } else {
      // Broadcast to all channels the user is in
      for (const [chId, clients] of this.channelService.getAllChannelClients()) {
        if (clients.some(c => c.userId === userId)) {
          const presence = this.channelService.getChannelPresence(chId);
          this.server.to(chId).emit('presence_update', { channelId: chId, users: presence });
        }
      }
    }

    return { success: true };
  }

  @SubscribeMessage('get_presence')
  handleGetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const presence = this.channelService.getChannelPresence(data.channelId);
    return { channelId: data.channelId, users: presence };
  }
}
