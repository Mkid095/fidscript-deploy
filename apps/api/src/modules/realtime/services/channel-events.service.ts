import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class ChannelEventsService {
  constructor(private eventService: EventService) {}

  /**
   * Notify channel that a client has left (socket emit + platform event).
   */
  async emitClientLeft(
    server: Server,
    channelId: string,
    userId: string,
    projectId: string,
    socketId: string,
  ): Promise<void> {
    server.to(channelId).emit('client_left', {
      channelId,
      userId,
      socketId,
    });

    await this.eventService.emit('realtime.client_left', projectId, {
      channelId,
      userId,
    });
  }

  /**
   * Notify channel that a client has joined (socket emit + platform event).
   */
  async emitClientJoined(
    server: Server,
    channelId: string,
    userId: string,
    projectId: string,
    socket: Socket,
  ): Promise<void> {
    socket.to(channelId).emit('client_joined', {
      channelId,
      userId,
      socketId: socket.id,
    });

    await this.eventService.emit('realtime.client_joined', projectId, {
      channelId,
      userId,
    });
  }

  /**
   * Broadcast a message to a channel (socket emit + platform event).
   */
  async emitMessage(
    server: Server,
    channelId: string,
    userId: string,
    projectId: string,
    messageId: string,
  ): Promise<void> {
    await this.eventService.emit('realtime.message_sent', projectId, {
      channelId,
      userId,
      messageId,
    });
  }

  /**
   * Notify channel of channel deletion (socket emit + platform event).
   */
  async emitChannelDeleted(
    server: Server,
    channelId: string,
    projectId: string,
  ): Promise<void> {
    server.to(channelId).emit('channel_deleted', { channelId });

    await this.eventService.emit('realtime.channel_deleted', projectId, {
      channelId,
    });
  }
}
