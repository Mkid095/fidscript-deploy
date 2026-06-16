import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller.js';
import { RealtimeService } from './realtime.service.js';
import { RealtimeGateway } from './gateways/realtime.gateway.js';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}