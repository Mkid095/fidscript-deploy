import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './gateways/realtime.gateway';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}