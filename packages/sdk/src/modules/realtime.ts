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
 * Room model:
 *   The gateway authorizes room joins via the `subscribe_project` message
 *   (handled by RealtimeSubscriptionService, which checks ProjectMember RBAC).
 *   Once joined to `project:<id>`, the bridge fans out every project-scoped
 *   platform event by its event *name* (e.g. `deployments.deployment.queued`).
 *   Clients receive events through `socket.onAny` and dispatch to handlers
 *   registered for either a specific event-name prefix or all events.
 *
 * Usage:
 * ```ts
 * const rt = new RealtimeModule(client);
 * await rt.connect(jwt, projectId);
 * rt.subscribeProject(projectId, event => console.log(event));
 * ```
 */
export class RealtimeModule {
  private socket?: Socket;
  // Map of event-name-prefix → handlers. The special key '*' matches all events.
  private handlers = new Map<string, Set<RealtimeEventHandler>>();
  private joinedProjects = new Set<string>();

  constructor(private client: FidscriptClient) {}

  /** Exchange a user JWT for a realtime connection. */
  async connect(token: string, _projectId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Tear down any existing socket before opening a new one.
      this.socket?.removeAllListeners();
      this.socket?.disconnect();

      this.socket = io('/realtime', {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', err => reject(err));

      // Delegate received platform events to registered handlers.
      // The bridge emits event *names* (the platform event type) as the
      // Socket.IO event name, with the PlatformEvent as payload.
      this.socket.onAny((eventName: string, data: unknown) => {
        const event = data as PlatformEvent;
        // Dispatch to exact-match handlers and prefix handlers.
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

  /**
   * Join a project's event room and register a handler for all events in that room.
   *
   * IMPORTANT: the gateway only handles the `subscribe_project` message (which
   * runs ProjectMember authorization before joining the socket to `project:<id>`).
   * A generic `subscribe` message has no handler and would silently no-op, so we
   * emit `subscribe_project` here.
   *
   * Returns an unsubscribe function that leaves the room and removes the handler.
   */
  subscribeProject(projectId: string, handler: RealtimeEventHandler): () => void {
    if (this.socket && !this.joinedProjects.has(projectId)) {
      this.socket.emit('subscribe_project', { projectId });
      this.joinedProjects.add(projectId);
    }
    return this.registerHandler('*', handler, () => {
      this.socket?.emit('unsubscribe_project', { projectId });
      this.joinedProjects.delete(projectId);
    });
  }

  /**
   * Subscribe to deployment events for a project. Joins the project room (same
   * authorization as subscribeProject) and only dispatches events whose type
   * starts with `deployments.`.
   */
  subscribeDeployments(projectId: string, handler: RealtimeEventHandler): () => void {
    if (this.socket && !this.joinedProjects.has(projectId)) {
      this.socket.emit('subscribe_project', { projectId });
      this.joinedProjects.add(projectId);
    }
    return this.registerHandler('deployments', handler, () => {
      this.socket?.emit('unsubscribe_project', { projectId });
      this.joinedProjects.delete(projectId);
    });
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
