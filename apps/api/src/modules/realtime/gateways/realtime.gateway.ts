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
import { RealtimeMessageHandlerService } from './realtime-message-handler.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private channelService: ChannelService,
    private presenceService: PresenceService,
    private tokenService: TokenService,
    private messages: RealtimeMessageHandlerService,
  ) {}

  onModuleInit() {
    this.channelService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = await this.tokenService.validateJwt(token);
      if (!payload) { client.disconnect(); return; }

      client.data.userId = payload.userId;
      client.data.projectId = payload.projectId;
      this.channelService.registerSocket(payload.userId, payload.projectId, client.id);
      client.emit('connected', { socketId: client.id });
    } catch { client.disconnect(); }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const projectId = client.data.projectId;
    if (userId) {
      await this.channelService.handleDisconnect(userId, projectId, client.id);
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string; token?: string }) {
    const result = await this.messages.joinChannel(client, client.data.userId, client.data.projectId, data);
    if (!result.success) return;
    return { channelId: result.channelId, success: true };
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    return this.messages.leaveChannel(client, client.data.userId, client.data.projectId, data.channelId);
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string; content: string; event?: string }) {
    const result = await this.messages.handleMessage(this.server, client.data.userId, client.data.projectId, data, client.id);
    if (!result.success) { client.emit('error', { message: result.error }); return; }
    return { success: true, messageId: result.messageId };
  }

  @SubscribeMessage('set_presence')
  async handleSetPresence(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId?: string; status: string }) {
    return this.messages.setPresence(this.server, client.data.userId, data);
  }

  @SubscribeMessage('get_presence')
  handleGetPresence(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    const presence = this.messages.getPresence(data.channelId);
    return { channelId: data.channelId, users: presence };
  }
}
