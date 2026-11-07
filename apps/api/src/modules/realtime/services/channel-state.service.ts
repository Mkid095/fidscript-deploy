import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';

export interface ChannelClient {
  socketId: string;
  userId: string;
  projectId: string;
  channelId: string;
  joinedAt: Date;
}

@Injectable()
export class ChannelStateService {
  // In-memory state — keyed by channelId
  private channelClients: Map<string, ChannelClient[]> = new Map();
  // In-memory state — keyed by userId, set of socket IDs
  private userSockets: Map<string, Set<string>> = new Map();

  private server: Server | null = null;

  constructor(private presenceService: PresenceService) {}

  /**
   * Called by the gateway after the WebSocket server is initialized.
   * Must be called before handling any channel events.
   */
  setServer(server: Server): void {
    this.server = server;
  }

  protected getServer(): Server | null {
    return this.server;
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle — state only
  // -------------------------------------------------------------------------

  registerSocket(userId: string, projectId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  async handleDisconnectState(
    userId: string,
    projectId: string,
    socketId: string,
  ): Promise<{ userWentOffline: boolean }> {
    const sockets = this.userSockets.get(userId);
    let userWentOffline = false;

    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        userWentOffline = true;
      }
    }

    // Remove from all channels (state only — no event emission here)
    for (const [channelId, clients] of this.channelClients.entries()) {
      const idx = clients.findIndex(c => c.socketId === socketId);
      if (idx !== -1) {
        clients.splice(idx, 1);
      }
    }

    return { userWentOffline };
  }

  // -------------------------------------------------------------------------
  // Channel operations — state only
  // -------------------------------------------------------------------------

  addClientToChannel(
    client: Socket,
    userId: string,
    projectId: string,
    channelId: string,
  ): void {
    client.join(channelId);

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
  }

  removeClientFromChannel(client: Socket, channelId: string): void {
    const clients = this.channelClients.get(channelId) || [];
    const idx = clients.findIndex(c => c.socketId === client.id);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
  }

  isClientInChannel(socketId: string, channelId: string): boolean {
    const clients = this.channelClients.get(channelId) || [];
    return clients.some(c => c.socketId === socketId);
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
  // Admin channel operations — state only
  // -------------------------------------------------------------------------

  evictChannelClients(channelId: string): void {
    const clients = this.channelClients.get(channelId) || [];
    for (const client of clients) {
      const socket = this.server?.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.leave(channelId);
      }
    }
    this.channelClients.delete(channelId);
  }
}
