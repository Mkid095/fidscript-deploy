export class CreateChannelDto {
  name!: string;
  isPrivate?: boolean;
  metadata?: Record<string, unknown>;
}

export class JoinChannelDto {
  channelId!: string;
  token?: string;
}

export class SendMessageDto {
  channelId!: string;
  content!: string;
  event?: string;
}

export class SetPresenceDto {
  channelId!: string;
  status!: 'online' | 'away' | 'busy' | 'offline';
}

export class GetChannelMessagesDto {
  channelId!: string;
  limit?: number;
  cursor?: string;
}