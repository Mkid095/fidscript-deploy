import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';

const BLOCKLIST_PREFIX = 'jwt:revoked:';

/**
 * Fast-path revocation cache for JWT access tokens.
 *
 * On logout (or any session-revoking event) we write a tombstone keyed by the
 * JWT's sessionId with a TTL matching the token's remaining lifetime. Every
 * JwtStrategy.validate() consults the blocklist BEFORE its DB session lookup —
 * if the key exists, the request is 401'd immediately.
 *
 * This is a deny-fast cache layered on top of the DB-backed session check in
 * JwtStrategy. The DB lookup remains the source of truth: if Redis is
 * unavailable we return false from `isRevoked` and the strategy still rejects
 * via session.expiresAt. The blocklist just short-circuits the DB hit on the
 * hot path so a stolen token cannot be replayed for the remainder of its
 * 15-minute window.
 */
@Injectable()
export class JwtBlocklistService {
  private readonly logger = new Logger(JwtBlocklistService.name);

  constructor(private redis: RedisService) {}

  async revoke(sessionId: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(`${BLOCKLIST_PREFIX}${sessionId}`, 1, ttlSeconds);
  }

  async isRevoked(sessionId: string): Promise<boolean> {
    // get<T>() returns null for missing keys and a JSON-parsed value when the
    // tombstone is present. Stored value is the number 1; RedisService.set
    // serializes via JSON.stringify so the read sees the parsed integer.
    return (await this.redis.get<number>(`${BLOCKLIST_PREFIX}${sessionId}`)) !== null;
  }
}