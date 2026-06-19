import { io, Socket } from 'socket.io-client';
import { FidscriptClient } from '../client';
import type { PlatformEvent } from '@fidscript/events';

export type RealtimeEventHandler = (event: PlatformEvent) => void;

export interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

/**
 * Phase 16 — Realtime SDK module wrapping Socket.IO.
 *
 * Connects to the platform realtime gateway with a JWT, subscribes to project-scoped
 * rooms, and dispatches typed platform events to handlers.
 *
 * Usage:
 * ```ts
 * const rt = new RealtimeModule(client);
 * await rt.connect(jwt);
 * rt.subscribe(`project:${projectId}`, event => console.log(event));
 * ```
 */
export class RealtimeModule {
  private socket?: Socket;
  private handlers = new Map<string, Set<RealtimeEventHandler>>();

  constructor(private client: FidscriptClient) {}

  /** Exchange a user JWT for a realtime connection to a project room */
  async connect(token: string, projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io('/realtime', {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', err => reject(err));

      // Delegate received platform events to registered handlers
      this.socket.onAny((event: string, data: unknown) => {
        const handlers = this.handlers.get(event);
        if (handlers) {
          for (const h of handlers) h(data as PlatformEvent);
        }
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.handlers.clear();
  }

  /** Subscribe to a room and receive all events published to it. */
  subscribe(room: string, handler: RealtimeEventHandler): () => void {
    this.socket?.emit('subscribe', { room });
    if (!this.handlers.has(room)) this.handlers.set(room, new Set());
    this.handlers.get(room)!.add(handler);
    return () => {
      this.socket?.emit('unsubscribe', { room });
      this.handlers.get(room)?.delete(handler);
    };
  }

  /** Subscribe to all events on a project's namespace. */
  subscribeProject(projectId: string, handler: RealtimeEventHandler) {
    return this.subscribe(`project:${projectId}`, handler);
  }

  /** Subscribe to deployment events for a project. */
  subscribeDeployments(projectId: string, handler: RealtimeEventHandler) {
    return this.subscribe(`project:${projectId}:deployments`, handler);
  }

  /** List available channels for a project */
  async listChannels(projectId: string) {
    const res = await this.client.get<{ channels: Channel[] }>(
      `/api/v1/projects/${projectId}/realtime/channels`,
    );
    return res.channels;
  }

  /** Create a channel */
  async createChannel(projectId: string, name: string, isPrivate = false) {
    return this.client.post<Channel>(`/api/v1/projects/${projectId}/realtime/channels`, { name, isPrivate });
  }

  /** Delete a channel */
  async deleteChannel(projectId: string, channelId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/realtime/channels/${channelId}`);
  }

  /** Emit a presence update */
  setPresence(status: 'online' | 'away' | 'busy' | 'offline', channelId?: string) {
    this.socket?.emit('set_presence', { status, channelId });
  }
}
