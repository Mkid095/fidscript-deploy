import { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';

export class RealtimeModule {
  private client: AxiosInstance;
  private projectId?: string;
  private socket?: Socket;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async listChannels(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/realtime/channels`);
    return response.data.channels;
  }

  async createChannel(projectId: string, name: string, isPrivate = false) {
    const response = await this.client.post(`/projects/${projectId}/realtime/channels`, { name, isPrivate });
    return response.data;
  }

  async deleteChannel(projectId: string, channelId: string) {
    const response = await this.client.delete(`/projects/${projectId}/realtime/channels/${channelId}`);
    return response.data;
  }

  async connect(token: string, handlers: {
    onMessage?: (data: any) => void;
    onClientJoined?: (data: any) => void;
    onClientLeft?: (data: any) => void;
    onPresence?: (data: any) => void;
  }) {
    this.socket = io('/realtime', {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to realtime');
    });

    this.socket.on('message', (data) => handlers.onMessage?.(data));
    this.socket.on('client_joined', (data) => handlers.onClientJoined?.(data));
    this.socket.on('client_left', (data) => handlers.onClientLeft?.(data));
    this.socket.on('presence', (data) => handlers.onPresence?.(data));

    return this.socket;
  }

  async joinChannel(channelId: string) {
    this.socket?.emit('join_channel', { channelId });
  }

  async leaveChannel(channelId: string) {
    this.socket?.emit('leave_channel', { channelId });
  }

  async sendMessage(channelId: string, content: string, event = 'message') {
    this.socket?.emit('message', { channelId, content, event });
  }

  async setPresence(status: 'online' | 'away' | 'busy' | 'offline', channelId?: string) {
    this.socket?.emit('set_presence', { status, channelId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}