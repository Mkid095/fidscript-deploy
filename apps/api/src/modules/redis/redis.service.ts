import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any = null;

  constructor(private configService: ConfigService) {
    this.initClient();
  }

  private async initClient() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured, caching disabled');
      return;
    }

    try {
      const { createClient } = await import('redis');
      this.client = createClient({ url: redisUrl });
      this.client.on('error', (err: any) => this.logger.error('Redis error:', err));
      await this.client.connect();
      this.logger.log('Connected to Redis');
    } catch (error) {
      this.logger.warn('Failed to connect to Redis:', (error as Error).message);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Redis GET error for ${key}:`, (error as Error).message);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for ${key}:`, (error as Error).message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for ${key}:`, (error as Error).message);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      this.logger.error(`Redis DEL pattern error for ${pattern}:`, (error as Error).message);
    }
  }

  /**
   * Atomic distributed lock acquire using SET NX PX + Lua compare-and-delete release.
   * Returns true if lock was acquired, false if already held by another token.
   * Gracefully degrades to true (allow execution) if Redis is unavailable.
   */
  async acquireLock(lockKey: string, token: string, ttlMs: number): Promise<boolean> {
    if (!this.client) return true;
    try {
      // SET key token NX PX ttl-ms — atomic set-if-not-exists
      const result = await this.client.set(lockKey, token, { NX: true, PX: ttlMs });
      if (result === 'OK') return true;
      // Key already held — check if it's our own token (idempotent on re-entry)
      const existing = await this.client.get(lockKey);
      return existing === token;
    } catch (error) {
      this.logger.error(`Redis acquireLock error for ${lockKey}:`, (error as Error).message);
      return true; // Degrade: allow job to run if Redis fails
    }
  }

  /**
   * Release a distributed lock using Lua compare-and-delete (only deletes if token matches).
   */
  async releaseLock(lockKey: string, token: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        { keys: [lockKey], arguments: [token] },
      );
    } catch (error) {
      this.logger.error(`Redis releaseLock error for ${lockKey}:`, (error as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
