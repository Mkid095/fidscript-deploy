import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  /** Seconds until the limit resets (0 when allowed). */
  retryAfter: number;
}

/**
 * Auth-focused rate limiting built on RedisService's atomic counter.
 *
 * Two patterns:
 * - `consume(key, limit, window)` — fixed-window attempt counter (use for
 *   per-IP throttling: increment on every attempt).
 * - `count(key)` — peek without incrementing (use for per-account failure
 *   gating: check at entry, increment via `consume` only on a failed attempt).
 *
 * Degrades fail-open when Redis is unavailable (consistent with
 * RedisService.acquireLock): the credential check itself still protects auth,
 * and failing closed would lock everyone out on a Redis hiccup.
 */
@Injectable()
export class AuthRateLimiter {
  constructor(private redis: RedisService) {}

  async consume(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
    const count = await this.redis.incrWithExpiry(key, windowSec);
    if (count === 0) return { allowed: true, count: 0, retryAfter: 0 };
    if (count > limit) return { allowed: false, count, retryAfter: windowSec };
    return { allowed: true, count, retryAfter: 0 };
  }

  async count(key: string): Promise<number> {
    return (await this.redis.get<number>(key)) ?? 0;
  }
}
