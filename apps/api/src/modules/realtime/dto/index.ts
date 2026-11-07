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

export class GenerateChannelTokenDto {
  // No fields. The token is a channel-scoped secret; user identity is bound at
  // presentation time by validateChannelToken(channelId, userId, token). Do not
  // accept a userId in the body — that would let any JWT holder mint a token
  // for an arbitrary user (privilege escalation / impersonation).
}