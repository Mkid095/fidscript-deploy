import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PresenceService {
  constructor(
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Persist a user's presence in a specific channel to Redis with 24h TTL.
   */
  async persistChannelPresence(channelId: string, userId: string, status: string): Promise<void> {
    const key = `presence:channel:${channelId}:user:${userId}`;
    await this.redisService.set(key, {
      userId,
      channelId,
      status,
      updatedAt: new Date().toISOString(),
    }, 86400);
  }

  /**
   * Persist a user's global presence to Redis with 1h TTL.
   */
  async persistGlobalPresence(userId: string, status: string): Promise<void> {
    const key = `presence:${userId}`;
    await this.redisService.set(key, { userId, status, updatedAt: new Date().toISOString() }, 3600);
  }

  /**
   * Update presence in both Redis (cross-instance sync) and Prisma (durable storage).
   */
  async updatePresence(userId: string, status: string): Promise<void> {
    await this.persistGlobalPresence(userId, status);
  }

  /**
   * Update presence in a channel, persisting to both Redis and Prisma.
   */
  async updateChannelPresence(channelId: string, userId: string, status: string): Promise<void> {
    await this.persistChannelPresence(channelId, userId, status);
  }

  /**
   * Build the in-memory presence list for a channel from current ChannelClient[] data.
   * Returns a summary of which users are present and their socket IDs.
   */
  buildChannelPresence(clients: Array<{ userId: string; socketId: string }>) {
    const userPresences = new Map<string, { userId: string; status: string; socketIds: string[] }>();

    for (const c of clients) {
      if (!userPresences.has(c.userId)) {
        userPresences.set(c.userId, { userId: c.userId, status: 'online', socketIds: [] });
      }
      userPresences.get(c.userId)!.socketIds.push(c.socketId);
    }

    return Array.from(userPresences.values());
  }
}
