import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { JwtBlocklistService } from '@/common/jwt-blocklist.service';

@Global()
@Module({
  providers: [RedisService, AuthRateLimiter, JwtBlocklistService],
  exports: [RedisService, AuthRateLimiter, JwtBlocklistService],
})
export class RedisModule {}
