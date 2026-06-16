import { Module, Global } from '@nestjs/common';
import { EventService } from './event.service.js';

@Global()
@Module({
  providers: [EventService],
  exports: [EventService],
})
export class EventsModule {}
