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
import { RealtimeSubscriptionService } from '@/modules/realtime/services/realtime-subscription.service';
import { projectRoom } from '@/modules/realtime/services/realtime-rooms';
import { RealtimeMessageHandlerService } from './realtime-message-handler.service';

const NAMESPACE = '/realtime';

@WebSocketGateway({ cors: { origin: '*' }, namespace: NAMESPACE })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private channelService: ChannelService,
    private presenceService: PresenceService,
    private tokenService: TokenService,
    private messages: RealtimeMessageHandlerService,
    private subscriptions: RealtimeSubscriptionService,
  ) {}

  onModuleInit() {
    this.channelService.setServer(this.server);
  }

  /**
   * Fan a platform event out to every socket authorized for a project.
   *
   * For a namespaced gateway, NestJS injects the Namespace (not the root
   * Server) into @WebSocketServer — so `this.server` is already the `/realtime`
   * namespace where the clients (and the `project:<id>` rooms they joined)
   * live. A plain `.to(room).emit()` reaches them; `.of()` would throw.
   */
  broadcastToProject(projectId: string, type: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(projectRoom(projectId)).emit(type, payload);
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

  /**
   * Subscribe to a project's live platform-event feed. Authorization: the user
   * MUST be a ProjectMember of the requested project, or the join is refused
   * (the bridge then only ever emits to members-only rooms). This is the
   * Phase 13 authorization prove-it (member of A, denied on B).
   */
  @SubscribeMessage('subscribe_project')
  async handleSubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const result = await this.subscriptions.subscribeToProject(
      client,
      client.data.userId,
      data.projectId,
    );
    if (!result.success) {
      client.emit('error', { message: result.error });
      return { success: false };
    }
    return { success: true, projectId: result.projectId };
  }

  @SubscribeMessage('unsubscribe_project')
  handleUnsubscribeProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    return this.subscriptions.unsubscribeFromProject(client, data.projectId);
  }
}
