import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';

const STATE_TTL_SEC = 5 * 60;

export interface GithubStatePayload {
  userId: string;
  redirectAfterUrl?: string;
}

/**
 * The state of an OAuth sign-in in progress.
 *
 * GitHub comes back to our callback without our JWT, so the state is how the
 * callback knows whose sign-in it is finishing. It lives in Redis for five
 * minutes and is used once.
 */
@Injectable()
export class GithubOAuthStateService {
  constructor(private readonly redis: RedisService) {}

  /** Remembers who the sign-in is for. */
  async remember(state: string, payload: GithubStatePayload): Promise<void> {
    await this.redis.set(`github:oauth:state:${state}`, payload, STATE_TTL_SEC);
  }

  /** Who the sign-in is for — and forgets it, so a state cannot be replayed. */
  async take(state: string): Promise<GithubStatePayload | null> {
    const payload = await this.redis.get<GithubStatePayload>(`github:oauth:state:${state}`);
    if (payload) await this.redis.del(`github:oauth:state:${state}`);
    return payload ?? null;
  }
}
