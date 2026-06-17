import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { ChannelService } from './services/channel.service';
import { PresenceService } from './services/presence.service';
import { TokenService } from './services/token.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RealtimeController],
  providers: [
    RealtimeService,
    RealtimeGateway,
    ChannelService,
    PresenceService,
    TokenService,
  ],
  exports: [RealtimeService, RealtimeGateway, ChannelService, PresenceService, TokenService],
})
export class RealtimeModule {}
