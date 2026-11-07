import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChannelService } from '@/modules/realtime/services/channel.service';
import { PresenceService } from '@/modules/realtime/services/presence.service';
import { TokenService } from '@/modules/realtime/services/token.service';

@Injectable()
export class RealtimeMessageHandlerService {
  constructor(
    private channelService: ChannelService,
    private presenceService: PresenceService,
    private tokenService: TokenService,
  ) {}

  async joinChannel(client: Socket, userId: string, projectId: string, data: { channelId: string; token?: string }) {
    const { channelId, token } = data;

    if (token) {
      const valid = await this.tokenService.validateChannelToken(channelId, userId, token);
      if (!valid) {
        client.emit('error', { message: 'Invalid channel token' });
        return { success: false };
      }
    }

    const result = await this.channelService.joinChannel(client, userId, projectId, channelId);
    if (!result.success && result.error) {
      client.emit('error', { message: result.error });
      return { success: false };
    }
    return { success: true, channelId };
  }

  async leaveChannel(client: Socket, userId: string, projectId: string, channelId: string) {
    const result = await this.channelService.leaveChannel(client, userId, projectId, channelId);
    return { success: result.success, channelId };
  }

  async handleMessage(
    server: Server,
    userId: string,
    projectId: string,
    data: { channelId: string; content: string; event?: string },
    socketId: string,
  ) {
    const { channelId, content, event } = data;
    const result = await this.channelService.handleMessage(server, userId, projectId, channelId, content, event || 'message', socketId);
    if (!result.success) {
      return { success: false, error: 'Not in channel' };
    }
    return { success: true, messageId: result.messageId };
  }

  async setPresence(server: Server, userId: string, data: { channelId?: string; status: string }) {
    const { channelId, status } = data;

    await this.presenceService.updatePresence(userId, status);
    if (channelId) {
      await this.presenceService.updateChannelPresence(channelId, userId, status);
    }

    if (channelId) {
      const presence = this.channelService.getChannelPresence(channelId);
      server.to(channelId).emit('presence_update', { channelId, users: presence });
    } else {
      for (const [chId, clients] of this.channelService.getAllChannelClients()) {
        if (clients.some(c => c.userId === userId)) {
          const presence = this.channelService.getChannelPresence(chId);
          server.to(chId).emit('presence_update', { channelId: chId, users: presence });
        }
      }
    }
    return { success: true };
  }

  getPresence(channelId: string) {
    return this.channelService.getChannelPresence(channelId);
  }
}
