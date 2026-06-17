import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { ChannelService } from './services/channel.service';
import { ChannelStateService } from './services/channel-state.service';
import { ChannelEventsService } from './services/channel-events.service';
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
    ChannelStateService,
    ChannelEventsService,
    PresenceService,
    TokenService,
  ],
  exports: [
    RealtimeService,
    RealtimeGateway,
    ChannelService,
    ChannelStateService,
    ChannelEventsService,
    PresenceService,
    TokenService,
  ],
})
export class RealtimeModule {}
