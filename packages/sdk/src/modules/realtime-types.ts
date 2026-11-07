import type { PlatformEvent } from '@fidscript-deploy/events';

export type RealtimeEventHandler = (event: PlatformEvent) => void;

export interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface Presence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  channelId?: string;
}

export interface RealtimeConfig {
  baseURL: string;
  token: string | (() => string);
}
