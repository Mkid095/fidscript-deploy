import { io, Socket } from 'socket.io-client';
import { FidscriptClient } from '../client';
import type { PlatformEvent } from '@fidscript-deploy/events';
import type { RealtimeEventHandler, Channel } from './realtime-types';

export type { RealtimeEventHandler, Channel } from './realtime-types';

/**
 * Phase 16 — Realtime SDK module wrapping Socket.IO.
 *
 * Connects to the platform realtime gateway with a JWT, subscribes to project-scoped
 * rooms, and dispatches typed platform events to handlers.
 */
export class RealtimeModule {
  private socket?: Socket;
  // Map of event-name-prefix → handlers. The special key '*' matches all events.
  private handlers = new Map<string, Set<RealtimeEventHandler>>();
  private joinedProjects = new Set<string>();

  constructor(private client: FidscriptClient) {}

  /**
   * Exchange a user JWT for a realtime connection.
   * `token` may be a string or a getter; a getter is preferred for long-lived
   * sessions so a refreshed JWT is picked up automatically on (re)connect.
   */
  async connect(token: string | (() => string), _projectId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.removeAllListeners();
      this.socket?.disconnect();

      const readToken = () => (typeof token === 'function' ? (token as () => string)() : token);

      this.socket = io('/realtime', {
        auth: (cb: (data: { token: string }) => void) => cb({ token: readToken() }),
        transports: ['websocket'],
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', err => reject(err));

      this.socket.onAny((eventName: string, data: unknown) => {
        const event = data as PlatformEvent;
        for (const [prefix, set] of this.handlers) {
          if (prefix === '*' || eventName === prefix || eventName.startsWith(prefix + '.') || eventName.startsWith(prefix)) {
            for (const h of set) {
              try { h(event); } catch { /* handler errors must not break dispatch */ }
            }
          }
        }
      });
    });
  }

  /** Whether the socket is currently connected. */
  get isConnected(): boolean {
    return !!this.socket?.connected;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.handlers.clear();
    this.joinedProjects.clear();
  }

  /** Join a project's event room and register a handler for all events. */
  subscribeProject(projectId: string, handler: RealtimeEventHandler): () => void {
    this.joinProject(projectId);
    return this.registerHandler('*', handler, () => this.leaveProject(projectId));
  }

  /** Subscribe to deployment events for a project. */
  subscribeDeployments(projectId: string, handler: RealtimeEventHandler): () => void {
    this.joinProject(projectId);
    return this.registerHandler('deployments', handler, () => this.leaveProject(projectId));
  }

  /** Subscribe to function events for a project. */
  subscribeFunctions(projectId: string, handler: RealtimeEventHandler): () => void {
    this.joinProject(projectId);
    return this.registerHandler('function', handler, () => this.leaveProject(projectId));
  }

  /** Subscribe to storage events for a project. */
  subscribeStorage(projectId: string, handler: RealtimeEventHandler): () => void {
    this.joinProject(projectId);
    return this.registerHandler('storage', handler, () => this.leaveProject(projectId));
  }

  /** Subscribe to queue events for a project. */
  subscribeQueues(projectId: string, handler: RealtimeEventHandler): () => void {
    this.joinProject(projectId);
    return this.registerHandler('queues', handler, () => this.leaveProject(projectId));
  }

  private joinProject(projectId: string): void {
    if (this.socket && !this.joinedProjects.has(projectId)) {
      this.socket.emit('subscribe_project', { projectId });
      this.joinedProjects.add(projectId);
    }
  }

  private leaveProject(projectId: string): void {
    this.socket?.emit('unsubscribe_project', { projectId });
    this.joinedProjects.delete(projectId);
  }

  /** Register a handler under a prefix and return an unsubscribe fn. */
  private registerHandler(prefix: string, handler: RealtimeEventHandler, onLastRemove: () => void): () => void {
    if (!this.handlers.has(prefix)) this.handlers.set(prefix, new Set());
    this.handlers.get(prefix)!.add(handler);
    return () => {
      this.handlers.get(prefix)?.delete(handler);
      if (this.handlers.get(prefix)?.size === 0) {
        this.handlers.delete(prefix);
        onLastRemove();
      }
    };
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
