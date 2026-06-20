import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';

@Global()
@Module({
  providers: [RedisService, AuthRateLimiter],
  exports: [RedisService, AuthRateLimiter],
})
export class RedisModule {}
